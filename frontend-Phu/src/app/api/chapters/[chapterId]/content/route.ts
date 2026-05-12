import { NextResponse } from "next/server";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { convex } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chapterId: string }> },
) {
  try {
    const { chapterId } = await params;
    const chapter = await convex.query(api.chapters.getById, {
      id: chapterId as Id<"chapters">,
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    console.log("Fetching content for chapter ID:", chapterId);

    // Get file content from R2
    const r2Object = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "",
        Key: chapter.url,
      }),
    );

    // Convert stream to string
    const content = await r2Object.Body?.transformToString();

    if (!content) {
      return NextResponse.json(
        { error: "Failed to read chapter content" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      content,
    });
  } catch (error) {
    console.error("Error fetching chapter content:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapter content" },
      { status: 500 },
    );
  }
}
