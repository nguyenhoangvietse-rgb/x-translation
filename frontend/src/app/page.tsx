"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ApiUploadResponse = {
  jobId: string;
  uploadUrl: string;
};

type JobStatusResponse = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed" | "not_found";
  completed_chunks?: number;
  total_chunks?: number;
  error?: string;
};

function getStatusLabel(status: JobStatusResponse["status"]) {
  if (status === "running") return "Running";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "not_found") return "Not Found";
  return "Queued";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobIdInput, setJobIdInput] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress =
    status?.completed_chunks && status.total_chunks
      ? Math.round((status.completed_chunks / status.total_chunks) * 100)
      : 0;
  const isJobActive =
    status?.status === "queued" ||
    status?.status === "running" ||
    (!status && Boolean(activeJobId));

  useEffect(() => {
    return () => {
      if (inputDebounceRef.current) {
        clearTimeout(inputDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      setIsPolling(true);
      try {
        const response = await fetch(`/api/jobs/${activeJobId}`);
        const data = (await response.json()) as JobStatusResponse;
        if (stop) return;

        setStatus(data);
        setError(null);

        if (data.status === "queued" || data.status === "running") {
          timer = setTimeout(poll, 5000);
          return;
        }
      } catch {
        if (!stop) {
          setError("Failed to poll job status.");
        }
      } finally {
        if (!stop) {
          setIsPolling(false);
        }
      }
    };

    void poll();

    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeJobId]);

  const onUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a .txt file.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatus(null);

    try {
      const uploadMetaRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const uploadMeta = (await uploadMetaRes.json()) as ApiUploadResponse & {
        error?: string;
      };
      if (!uploadMetaRes.ok) {
        throw new Error(uploadMeta.error ?? "Failed to create upload URL.");
      }

      const uploadRes = await fetch(uploadMeta.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to R2.");
      }

      setActiveJobId(uploadMeta.jobId);
      setJobIdInput(uploadMeta.jobId);
      setStatus({ jobId: uploadMeta.jobId, status: "queued" });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed unexpectedly.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      <main className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-semibold">Novel Translation Pipeline</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Upload a source <code>.txt</code> file to R2, track translation progress,
            and download the translated output when completed.
          </p>
        </section>

        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-4 text-lg font-medium">Upload</h2>
          <form className="space-y-3" onSubmit={onUpload}>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700"
            />
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isUploading ? "Uploading..." : "Upload & Start Job"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-4 text-lg font-medium">Track Job</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={jobIdInput}
              onChange={(event) => {
                const value = event.target.value;
                setJobIdInput(value);

                if (inputDebounceRef.current) {
                  clearTimeout(inputDebounceRef.current);
                }

                const normalized = value.trim();
                if (!normalized) {
                  setActiveJobId(null);
                  setStatus(null);
                  return;
                }

                inputDebounceRef.current = setTimeout(() => {
                  setStatus(null);
                  setActiveJobId(normalized);
                }, 500);
              }}
              placeholder="Paste job ID (polls automatically)"
              className="w-full flex-1 rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700"
            />
          </div>

          {isJobActive && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <p className="text-zinc-600 dark:text-zinc-300">
                  {status?.status === "queued"
                    ? "Waiting for GitHub Action runner..."
                    : "Translating chapters..."}
                </p>
                <p className="font-medium">{status?.total_chunks ? `${progress}%` : "..."}</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out ${
                    status?.total_chunks || status?.status === "completed"
                      ? ""
                      : "animate-pulse"
                  }`}
                  style={{
                    width: status?.total_chunks ? `${progress}%` : "35%",
                  }}
                />
              </div>
            </div>
          )}

          {status && (
            <div className="mt-4 space-y-2 rounded-md bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
              <p>
                <span className="font-medium">Job ID:</span> {status.jobId}
              </p>
              <p>
                <span className="font-medium">Status:</span> {getStatusLabel(status.status)}
              </p>
              {status.total_chunks && (
                <p>
                  <span className="font-medium">Progress:</span>{" "}
                  {status.completed_chunks ?? 0}/{status.total_chunks} ({progress}%)
                </p>
              )}
              {status.error && (
                <p className="text-red-600 dark:text-red-400">{status.error}</p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <a
              href={activeJobId ? `/api/jobs/${activeJobId}/download` : "#"}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-disabled={!activeJobId || status?.status !== "completed"}
              onClick={(event) => {
                if (!activeJobId || status?.status !== "completed") {
                  event.preventDefault();
                }
              }}
            >
              Download Translation
            </a>
            {isPolling && (
              <p className="text-sm text-zinc-500">Auto polling every 5 seconds...</p>
            )}
          </div>
        </section>

        {error && (
          <section className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </section>
        )}
      </main>
    </div>
  );
}
