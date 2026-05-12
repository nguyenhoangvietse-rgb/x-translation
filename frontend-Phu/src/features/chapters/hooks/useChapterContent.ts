import { useQuery } from "@tanstack/react-query";

interface ChapterContentResponse {
  content: string;
  chapter: {
    id: string;
    title?: string;
    chapterNumber?: number;
  };
}

export function useChapterContent(
  chapterId: string | null | undefined,
  translated = false,
) {
  return useQuery<ChapterContentResponse>({
    queryKey: ["chapter-content", chapterId, translated],
    queryFn: async () => {
      if (!chapterId) {
        throw new Error("Chapter ID is required");
      }

      // URL encode the chapterId to ensure it is safe for use in a URL
      const encodedChapterId = encodeURIComponent(chapterId);

      const response = await fetch(
        `/api/chapters/${encodedChapterId}/${translated ? "translated-content" : "content"}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch chapter content");
      }

      return response.json();
    },
    enabled: !!chapterId, // Only run the query if chapterId is not null or undefined
  });
}
