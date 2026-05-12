"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { use, useEffect, useState } from "react";
import { useChapterContent } from "@/features/chapters/hooks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Languages, FileText } from "lucide-react";

export default function ChapterPage({
  params,
}: {
  params: Promise<{ chapterNumber: string; slug: string }>;
}) {
  const { chapterNumber, slug } = use(params);
  const chapterNum = chapterNumber.split("-")[1]; // Extract chapter number from URL segment
  const novel = useQuery(api.novels.getBySlug, { slug });

  const chapter = useQuery(api.chapters.getByNovelIdAndChapterNumber, {
    novelId: novel?._id,
    chapterNumber: parseInt(chapterNum),
  });

  // Fetch chapter content from R2 via API route using React Query
  const {
    data: originalContent,
    isLoading: isLoadingOriginal,
    error: originalError,
  } = useChapterContent(chapter?._id, false);

  const {
    data: translatedContent,
    isLoading: isLoadingTranslated,
    error: translatedError,
    refetch: refetchTranslatedContent,
  } = useChapterContent(chapter?._id, true);

  useEffect(() => {
    if (chapter?.translatedUrl) {
      refetchTranslatedContent();
    }
  }, [chapter?.translatedUrl, refetchTranslatedContent]);

  const [translateError, setTranslateError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!chapter?._id) return;

    setTranslateError(null);

    try {
      const response = await fetch(`/api/chapters/${chapter._id}/translate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start translation");
      }

      // Optionally show success message
      // The translated content will be refetched automatically via React Query
    } catch (error) {
      console.error("Translation error:", error);
      setTranslateError(
        error instanceof Error ? error.message : "Failed to translate chapter",
      );
    }
  };

  if (novel === undefined || chapter === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (novel === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Novel not found</div>
      </div>
    );
  }

  if (chapter === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Chapter not found</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Decorative grid */}
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
      {/* Gold orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-130 w-130 rounded-full blur-3xl opacity-30"
        style={{ background: "var(--gradient-gold)" }}
      />

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{novel.title}</h1>
          <h2 className="text-xl text-muted-foreground">
            {chapter.title || `Chapter ${chapter.chapterNumber}`}
          </h2>
        </div>

        <Tabs defaultValue="original" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="original">
              <FileText className="h-4 w-4 mr-2" />
              Original
            </TabsTrigger>
            <TabsTrigger value="translated">
              <Languages className="h-4 w-4 mr-2" />
              Translated
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-0">
            <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-8">
              {isLoadingOriginal && (
                <div className="text-muted-foreground">Loading content...</div>
              )}

              {originalError && (
                <div className="text-destructive">
                  {originalError instanceof Error
                    ? originalError.message
                    : "Failed to load chapter content"}
                </div>
              )}

              {originalContent?.content && (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                    {originalContent.content}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="translated" className="mt-0">
            <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-8">
              {!chapter.translatedUrl ? (
                <div className="text-center py-12">
                  <Languages className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-6">
                    This chapter hasn&apos;t been translated yet.
                  </p>
                  <Button
                    onClick={handleTranslate}
                    disabled={chapter.translateStatus !== "not_requested"}
                    size="lg"
                  >
                    <Languages className="h-4 w-4 mr-2" />
                    {chapter.translateStatus === "not_requested"
                      ? "Translate Chapter"
                      : "Translating..."}
                  </Button>
                  {chapter.translateStatus !== "completed" && (
                    <p className="mt-2">
                      Translate status: {chapter.translateStatus}
                    </p>
                  )}
                  {translateError && (
                    <p className="text-destructive mt-4">{translateError}</p>
                  )}
                </div>
              ) : (
                <>
                  {isLoadingTranslated && (
                    <div className="text-muted-foreground">
                      Loading translation...
                    </div>
                  )}

                  {translatedError && (
                    <div className="text-destructive">
                      {translatedError instanceof Error
                        ? translatedError.message
                        : "Failed to load translated content"}
                    </div>
                  )}

                  {translatedContent?.content && (
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                        {translatedContent.content}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
