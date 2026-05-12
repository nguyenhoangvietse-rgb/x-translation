import { NextResponse } from "next/server";

import { readObjectAsText } from "@/lib/r2";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const jobId = params.id;
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id." }, { status: 400 });
  }

  const outputKey = `output/${jobId}/translated.txt`;

  try {
    const text = await readObjectAsText(outputKey);
    if (!text) {
      return NextResponse.json({ error: "Output file is empty." }, { status: 404 });
    }

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="translated-${jobId}.txt"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Output not found or not ready yet." },
      { status: 404 },
    );
  }
}
