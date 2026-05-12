import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { waitUntil } from "@vercel/functions";

export async function POST(request: NextRequest) {
  try {
    // get the novelId, startChapter, and endChapter from the request body
    const { novelId, startChapter, endChapter } = await request.json();

    if (!novelId || !startChapter || !endChapter) {
      return NextResponse.json(
        { error: "novelId, startChapter, and endChapter are required" },
        { status: 400 },
      );
    }

    // Validate chapter range
    if (startChapter > endChapter) {
      return NextResponse.json(
        { error: "startChapter must be less than or equal to endChapter" },
        { status: 400 },
      );
    }

    const novel = await convex.query(api.novels.getById, {
      id: novelId as Id<"novels">,
    });

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    // Find uploads by novelId from Convex
    const uploads = await convex.query(api.novels.getUploads, {
      novelId: novelId as Id<"novels">,
    });

    if (!uploads || uploads.length === 0) {
      return NextResponse.json(
        { error: "No uploads found for this novel" },
        { status: 404 },
      );
    }

    // Find smaller upload that covers the chapter range
    let relevantUpload: Doc<"uploads">[] = uploads.filter((upload) => {
      if (upload.isFull || !upload.fromChapter || !upload.toChapter) {
        return false;
      }
      if (upload.toChapter < startChapter || upload.fromChapter > endChapter) {
        return false;
      }
      return true;
    });

    if (relevantUpload.length === 0) {
      const fullUpload = uploads.find((upload) => upload.isFull);
      if (fullUpload) {
        relevantUpload = [fullUpload];
      }
    }

    if (!relevantUpload) {
      return NextResponse.json(
        {
          error: "No upload found that covers the specified chapter range",
          availableUploads: uploads,
        },
        { status: 404 },
      );
    }

    // TODO: Trigger partition workflow with the upload URL
    console.log("Partition request:", {
      novelId,
      startChapter,
      endChapter,
      uploadUrls: relevantUpload.map((u) => u.url),
    });
    partitionChapters(
      relevantUpload,
      novelId,
      novel.slug,
      startChapter,
      endChapter,
    );

    return NextResponse.json({
      success: true,
      uploads: relevantUpload,
      message: "Partition request received",
    });
  } catch (error) {
    console.error("Error processing partition request:", error);
    return NextResponse.json(
      { error: "Failed to process partition request" },
      { status: 500 },
    );
  }
}

const CHAPTER_REGEX =
  /^第\s*([0-9一二三四五六七八九十百千萬两零〇]+)\s*[章节回話话节卷]\s*.*$/gm;

// Convert Chinese numerals to Arabic numbers
const chineseToNumber = (chinese: string): number => {
  // If it's already an Arabic number
  if (/^\d+$/.test(chinese)) {
    return parseInt(chinese, 10);
  }

  // Chinese numeral conversion
  const numerals: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    百: 100,
    千: 1000,
    萬: 10000,
    万: 10000,
    两: 2,
    兩: 2,
  };

  let result = 0;
  let temp = 0;
  let unit = 1;

  for (let i = chinese.length - 1; i >= 0; i--) {
    const char = chinese[i];
    const value = numerals[char];

    if (value === undefined) continue;

    if (value >= 10) {
      if (temp === 0) temp = 1;
      unit = value;
      result += temp * unit;
      temp = 0;
    } else {
      temp = value;
    }
  }

  return result + temp;
};

const extractChapters = (
  text: string,
  novelId: Id<"novels">,
  novelSlug: string,
  startChapter: number,
  endChapter: number,
): Promise<string>[] => {
  const matches = [...text.matchAll(CHAPTER_REGEX)];

  if (matches.length === 0) {
    return [];
  }

  const chapters: Promise<string>[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    // Extract and parse the chapter number from the captured group
    const chapterNumberStr = current[1]; // The captured group contains the chapter number
    const chapterNumber = chineseToNumber(chapterNumberStr);
    console.log(
      `Extracted chapter number: ${chapterNumber} from string: ${chapterNumberStr}`,
    );

    // Skip if chapter number is invalid
    if (!chapterNumber || isNaN(chapterNumber)) {
      console.warn(`Invalid chapter number: ${chapterNumberStr}`);
      continue;
    }

    // Skip chapters outside the requested range
    if (chapterNumber < startChapter || chapterNumber > endChapter) {
      continue;
    }

    const startIndex = current.index!;
    const endIndex = next?.index ?? text.length;

    const rawChapter = text.slice(startIndex, endIndex).trim();

    const firstLineEnd = rawChapter.indexOf("\n");

    const title =
      firstLineEnd === -1
        ? rawChapter
        : rawChapter.slice(0, firstLineEnd).trim();

    const content =
      firstLineEnd === -1 ? "" : rawChapter.slice(firstLineEnd).trim();

    const uploadChapter = new Promise<string>((res, rej) => {
      s3Client
        .send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || "",
            Key: `phu-raw/${novelSlug}/${title}.txt`,
            Body: content,
          }),
        )
        .then(() => {
          convex.mutation(api.chapters.create, {
            novelId,
            title,
            chapterNumber,
            url: `phu-raw/${novelSlug}/${title}.txt`,
          });
          res(`Uploaded chapter ${title} successfully`);
        })
        .catch((err) => {
          console.error(`Failed to upload chapter ${title}:`, err);
          rej(err);
        });
    });

    chapters.push(uploadChapter);
  }

  return chapters;
};

const partitionChapters = async (
  relevantUpload: Doc<"uploads">[],
  novelId: Id<"novels">,
  novelSlug: string,
  startChapter: number,
  endChapter: number,
) => {
  // get object from r2
  for (const upload of relevantUpload) {
    console.log("Processing upload:", upload);
    const r2Object = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "",
        Key: upload.url,
      }),
    );
    const r2ObjectBody = await r2Object.Body?.transformToString();
    if (!r2ObjectBody) {
      console.error("Failed to read R2 object body for upload:", upload);
      continue;
    }
    const chapters = extractChapters(
      r2ObjectBody,
      novelId,
      novelSlug,
      startChapter,
      endChapter,
    );
    waitUntil(Promise.all(chapters));
  }
  // TODO: Further process chapters and partition them as needed
};
