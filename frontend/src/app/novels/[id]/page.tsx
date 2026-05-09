"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import Image from "next/image";
import { UploadButton } from "@/features/uploads";
import { UploadsList } from "@/features/uploads";
import { ChaptersList } from "@/features/chapters";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function NovelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const novel = useQuery(api.novels.getById, { id: id as Id<"novels"> });
  const uploads = useQuery(api.novels.getUploads, {
    novelId: id as Id<"novels">,
  });
  const chapters = useQuery(api.novels.getChapters, {
    novelId: id as Id<"novels">,
  });

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Decorative elements */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 mx-auto max-w-7xl px-6 py-6">
        <Link
          href="/novels"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="uppercase tracking-widest">Back to library</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-12">
        {/* Novel header */}
        <div className="mb-12">
          <div className="flex gap-8 items-start">
            {novel.coverPhoto && (
              <div className="shrink-0">
                <Image
                  src={novel.coverPhoto}
                  alt={novel.title}
                  width={240}
                  height={320}
                  className="w-60 h-80 object-cover rounded-lg border border-border shadow-xl"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5 text-accent" />
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Novel Details
                </span>
              </div>
              <h1 className="font-display text-6xl text-foreground mb-4">
                {novel.title}
              </h1>
              {novel.originalTitle && (
                <p className="text-xl text-muted-foreground mb-4">
                  {novel.originalTitle}
                </p>
              )}
              {novel.author && (
                <p className="text-muted-foreground mb-6">
                  <span className="text-foreground font-medium">Author:</span>{" "}
                  {novel.author}
                </p>
              )}
              {novel.description && (
                <p className="text-muted-foreground max-w-2xl leading-relaxed">
                  {novel.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content sections */}
        <Tabs defaultValue="chapters" className="space-y-6">
          <div className="flex justify-between w-full align-center">
            <TabsList>
              <TabsTrigger value="chapters">Chapters</TabsTrigger>
              <TabsTrigger value="uploads">Uploads</TabsTrigger>
            </TabsList>
            <UploadButton novelId={id as Id<"novels">} />
          </div>

          <TabsContent value="chapters">
            <ChaptersList chapters={chapters} />
          </TabsContent>

          <TabsContent value="uploads">
            <UploadsList uploads={uploads} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
