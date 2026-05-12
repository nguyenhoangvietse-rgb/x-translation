export interface Env {
  LIBRARY: R2Bucket;
  GITHUB_TOKEN: string;
  OWNER: string;
  REPO: string;
}

export interface Book {
  name: string;
  uploaded: string;
  status: "done" | "pending";
  chapters: number;
  hasCover?: boolean;
}

export interface NovelMeta {
  story_name: string;
  raw_hash: string;
  translated_name?: string;
  chapters: { id: number; title: string; translated_title?: string; path: string; hash?: string }[];
}

export interface Novel {
  name: string;
  chapterCount: number;
  hasIntro: boolean;
  displayName?: string;
  hasCover?: boolean;
}

export interface Chapter {
  id: number;
  title: string;
  translated_title?: string;
}
