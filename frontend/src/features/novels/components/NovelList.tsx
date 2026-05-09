"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feather } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function NovelList() {
  const novels = useQuery(api.novels.list);

  if (!novels) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Loading novels...</div>
      </div>
    );
  }

  if (novels.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur">
        <div className="flex items-center justify-end p-6 border-b border-border">
          <div className="text-right">
            <div className="font-display text-4xl text-foreground">0</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
              In your library
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Feather className="h-10 w-10 text-primary-foreground" />
          </div>
          <h3 className="font-display text-2xl text-foreground mb-3">
            Your shelf is empty
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Add your first novel using the form. The story begins with a single
            title.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur">
      <div className="flex items-center justify-end p-6 border-b border-border">
        <div className="text-right">
          <div className="font-display text-4xl text-foreground">
            {novels.length}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
            In your library
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {novels.map((novel) => (
            <Link
              key={novel._id}
              href={`/novels/${novel._id}`}
              className="rounded-lg border border-border bg-background/50 hover:bg-background/80 hover:border-accent transition-all cursor-pointer group overflow-hidden block"
            >
              <div className="w-full aspect-square relative">
                {novel.coverPhoto ? (
                  <Image
                    src={novel.coverPhoto}
                    alt={novel.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Feather className="h-10 w-10 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                    {novel.title.toLocaleUpperCase()}
                  </h3>
                  {novel.originalTitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {novel.originalTitle.toLocaleUpperCase()}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      Tác giả:
                    </span>{" "}
                    {novel.author}
                  </p>
                  <p className="text-muted-foreground line-clamp-3 mt-3 pt-3 border-t border-border/50">
                    {novel.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
