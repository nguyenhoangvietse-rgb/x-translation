import { NextResponse } from "next/server";

import { objectExists, readObjectAsText } from "@/lib/r2";

type JobStatus = {
  status: "queued" | "running" | "completed" | "failed";
  total_chunks?: number;
  completed_chunks?: number;
  started_at?: string;
  estimated_finish?: string;
  output_key?: string;
  error?: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const jobId = params.id;
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id." }, { status: 400 });
  }

  const statusKey = `status/${jobId}.json`;
  const statusText = await readObjectAsText(statusKey);

  if (!statusText) {
    const inputExists = await objectExists(`input/${jobId}/novel.txt`);
    return NextResponse.json(
      {
        jobId,
        status: inputExists ? "queued" : "not_found",
      },
      { status: inputExists ? 200 : 404 },
    );
  }

  try {
    const parsedStatus = JSON.parse(statusText) as JobStatus;
    return NextResponse.json({
      jobId,
      ...parsedStatus,
      statusKey,
    });
  } catch {
    return NextResponse.json(
      {
        jobId,
        status: "failed",
        error: "Invalid status.json format.",
      },
      { status: 500 },
    );
  }
}
