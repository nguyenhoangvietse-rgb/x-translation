import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { waitUntil } from "@vercel/functions";
import axios from "axios";

const requestDeekseek = async (
  slug: string,
  chapterId: Id<"chapters">,
  chapterNumber: number,
  text: string,
) => {
  const url = "https://api.deepseek.com/v1/chat/completions";
  const system_instruction = `
        "Bạn là một dịch giả chuyên nghiệp, am hiểu sâu sắc về thể loại truyện Tiên Hiệp, Huyền Huyễn và văn hóa cổ phong Trung Hoa. "
        "Nhiệm vụ của bạn là dịch văn bản từ tiếng Trung sang tiếng Việt.\n\n"
        "MỤC TIÊU:\n"
        "1. Văn phong: Trang trọng, cổ kính, trôi chảy, giàu hình ảnh. Không dùng từ hiện đại, không để bị lỗi 'convert' (Hán Việt thô).\n"
        "2. Xưng hô: Linh hoạt theo vai vế (Bổn tọa, tại hạ, lão phu, tiểu tử, vãn bối, các hạ, sư phụ, đồ nhi...).\n"
        "3. Thuật ngữ: Bắt buộc dùng Hán - Việt chuẩn tu tiên (Luyện Khí, Trúc Cơ, Kim Đan, Tông môn, Động phủ, Đạo tâm, Pháp bảo...).\n"
        "4. Tên riêng: Giữ nguyên âm Hán - Việt cho tên người, chiêu thức, địa danh (Ví dụ: Lâm Phong, Thanh Vân Môn).\n\n"
        "QUY TẮC BẮT BUỘC:\n"
        "- KHÔNG lược bỏ chi tiết.\n"
        "- KHÔNG thêm lời bình luận của AI.\n"
        "- Chuyển ngữ từ lóng hiện đại (nếu có) sang văn phong cổ đại phù hợp.\n"
        "- Đảm bảo nhất quán tên gọi toàn văn bản.\n"
        "- CHỈ trả về bản dịch hoàn chỉnh."
    `;
  const payload = {
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: system_instruction },
      { role: "user", content: `Dịch đoạn truyện sau:\n\n${text}` },
    ],
    temperature: 0.3,
    max_tokens: 32768,
    stream: false,
  };
  try {
    const key = `phu-translated/${slug}/chapter-${chapterNumber}.txt`;
    console.log(
      `Sending translation request for chapter ${key} to Deepseek...`,
    );
    await convex.mutation(api.chapters.updateTranslateStatus, {
      chapterId,
      translateStatus: "requesting_ai",
    });
    const reponse = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
    });
    const translatedText = reponse.data.choices[0].message.content;
    console.log(`TranslatedText: ${translatedText.substring(0, 100)}...`);
    console.log(`Received translation for chapter ${key}, uploading to R2...`);
    await convex.mutation(api.chapters.updateTranslateStatus, {
      chapterId,
      translateStatus: "saving_r2",
    });
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: translatedText,
      }),
    );
    console.log(`Uploaded translated chapter ${key} to R2, updating Convex...`);
    await convex.mutation(api.chapters.updateTranslatedUrl, {
      chapterId: chapterId,
      translatedUrl: key,
    });
    await convex.mutation(api.chapters.updateTranslateStatus, {
      chapterId,
      translateStatus: "completed",
    });
  } catch (error) {
    await convex.mutation(api.chapters.updateTranslateStatus, {
      chapterId,
      translateStatus: "error",
    });
    if (axios.isAxiosError(error)) {
      console.error(
        "Deepseek API error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Deepseek API error: ${error.response?.status || "unknown"}`,
      );
    }
    console.error("Translation request failed:", error);
    throw error;
  }
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ chapterId: string }> },
) => {
  const { chapterId } = await params;

  const chapter = await convex.query(api.chapters.getById, {
    id: chapterId as Id<"chapters">,
  });

  const novel = await convex.query(api.novels.getById, {
    id: chapter?.novelId as Id<"novels">,
  });

  if (!chapter || !novel) {
    return new Response(
      JSON.stringify({ error: "Chapter or novel not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const objectR2 = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: chapter.url,
    }),
  );

  const text = await objectR2.Body?.transformToString();

  if (!text) {
    return new Response(
      JSON.stringify({ error: "Failed to read chapter content" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    console.log(`Starting translation for chapter ${chapterId}...`);

    waitUntil(
      requestDeekseek(novel.slug, chapter._id, chapter.chapterNumber, text),
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Translation request received",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to translate chapter" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
