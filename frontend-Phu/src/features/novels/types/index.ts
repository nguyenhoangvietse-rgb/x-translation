// Novel-related type definitions
export interface Novel {
  _id: string;
  title: string;
  originalTitle?: string;
  coverPhoto?: string;
  author?: string;
  description?: string;
  chapterCount?: number;
}
