"use client";

import { FileText, Calendar } from "lucide-react";

interface Upload {
  _id: string;
  _creationTime: number;
  novelId: string;
  url: string;
  isFull: boolean;
  fromChapter?: number;
  toChapter?: number;
}

interface UploadsListProps {
  uploads?: Upload[];
}

export function UploadsList({ uploads }: UploadsListProps) {
  if (!uploads) {
    return (
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur p-6">
        <div className="text-muted-foreground text-center">
          Loading uploads...
        </div>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur p-12">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--gradient-gold)" }}
          >
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="font-display text-xl text-foreground mb-2">
            No uploads yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload a TXT file to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur">
      <div className="divide-y divide-border">
        {uploads.map((upload) => (
          <div
            key={upload._id}
            className="p-4 hover:bg-background/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-accent mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {upload.isFull ? "Full Novel" : "Partial Upload"}
                  </span>
                  {!upload.isFull && upload.fromChapter && upload.toChapter && (
                    <span className="text-xs text-muted-foreground">
                      Chapters {upload.fromChapter}-{upload.toChapter}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(upload._creationTime).toLocaleDateString()}
                </div>
              </div>
              <a
                href={upload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                View
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
