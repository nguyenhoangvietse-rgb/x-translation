// Upload-related type definitions
export interface Upload {
  _id: string;
  novelId: string;
  url: string;
  isFull: boolean;
  fromChapter?: number;
  toChapter?: number;
}
