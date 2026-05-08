import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createUploadUrl } from "@/lib/r2";

type UploadRequestBody = {
  filename?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UploadRequestBody;
    const filename = body.filename?.trim();

    if (!filename?.toLowerCase().endsWith(".txt")) {
      return NextResponse.json(
        { error: "Only .txt files are supported." },
        { status: 400 },
      );
    }

    const jobId = randomUUID();
    const { key, uploadUrl } = await createUploadUrl(jobId);

    return NextResponse.json({
      jobId,
      key,
      uploadUrl,
      expiresInSeconds: 900,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create upload URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
