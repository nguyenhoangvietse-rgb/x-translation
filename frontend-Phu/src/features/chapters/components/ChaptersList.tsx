"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { BookMarked, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";

interface ChaptersListProps {
  chapters?: Doc<"chapters">[];
}

export function ChaptersList({ chapters }: ChaptersListProps) {
  const params = useParams();
  const slug = params.slug;
  if (!chapters) {
    return (
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur p-6">
        <div className="text-muted-foreground text-center">
          Loading chapters...
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur p-12">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--gradient-gold)" }}
          >
            <BookMarked className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="font-display text-xl text-foreground mb-2">
            No chapters yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Chapters will appear here after processing uploads
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur">
      <div className="divide-y divide-border">
        {chapters.map((chapter, index) => (
          <div
            key={chapter._id}
            className="p-4 hover:bg-background/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-medium">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-foreground">
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </span>
              </div>
              {chapter && (
                <a
                  href={`/novels/${slug}/chapter-${chapter.chapterNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
