import type { Env, Book, Novel, NovelMeta } from "./types";
import { formatDate } from "./utils";

export async function getNovels(env: Env): Promise<Novel[]> {
  const seen = new Set<string>();
  const novels: Novel[] = [];

  let cursor: string | undefined;
  do {
    const list = await env.LIBRARY.list({ prefix: "translated/", cursor });
    for (const obj of list.objects) {
      const m = obj.key.match(/^translated\/(.+)\/metadata\.json$/);
      if (!m) continue;
      const name = m[1];
      if (seen.has(name)) continue;
      seen.add(name);

      try {
        const metaObj = await env.LIBRARY.get(`translated/${name}/metadata.json`);
        if (!metaObj) continue;
        const meta: NovelMeta = JSON.parse(await metaObj.text());

        const displayName = meta.story_name || undefined;

        let hasCover = false;
        try {
          hasCover = !!(await env.LIBRARY.head(`processed/${name}/cover`));
        } catch {}

        novels.push({
          name,
          chapterCount: meta.chapters.filter(c => c.id > 0).length,
          displayName,
          hasCover,
          translating: meta.translating,
          author: meta.author,
        });
      } catch {}
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  return novels;
}

export async function getMeta(env: Env, name: string): Promise<NovelMeta | null> {
  try {
    const obj = await env.LIBRARY.get(`translated/${name}/metadata.json`);
    if (!obj) return null;
    return JSON.parse(await obj.text()) as NovelMeta;
  } catch {
    return null;
  }
}

export async function getChapterText(env: Env, name: string, id: number, chPath?: string): Promise<string | null> {
  try {
    const key = chPath || `translated/${name}/chapter_${id}.txt`;
    const obj = await env.LIBRARY.get(key);
    if (!obj) return null;
    return await obj.text();
  } catch {
    return null;
  }
}

export async function getAdminBooks(env: Env): Promise<Book[]> {
  const books: Book[] = [];
  let cursor: string | undefined;

  do {
    const list = await env.LIBRARY.list({ prefix: "raw/", cursor });
    for (const obj of list.objects) {
      const name = obj.key.replace(/^raw\//, "").replace(/\.txt$/i, "");
      if (!name) continue;

      let metaObj: R2Object | null = null;
      try {
        metaObj = await env.LIBRARY.head(`translated/${name}/metadata.json`);
      } catch {}

      let processedObj: R2Object | null = null;
      try {
        processedObj = await env.LIBRARY.head(`processed/${name}/info.json`);
      } catch {}

      let coverObj: R2Object | null = null;
      try {
        coverObj = await env.LIBRARY.head(`processed/${name}/cover`);
      } catch {}

      let translating = false;
      let translatedChapters = 0;
      if (metaObj) {
        try {
          const metaContent = await env.LIBRARY.get(`translated/${name}/metadata.json`);
          if (metaContent) {
            const parsed = JSON.parse(await metaContent.text());
            translating = !!parsed.translating;
            translatedChapters = (parsed.chapters || []).filter((c: any) => c.id > 0).length;
          }
        } catch {}
      }
      if (!translating) {
        try {
          translating = !!(await env.LIBRARY.head(`translated/${name}/_translate_pending`));
        } catch {}
      }

      let author = "";
      let totalChapters = 0;
      let infoStatus = "";
      let splitCurrent = 0;
      let splitTotal = 0;
      if (processedObj) {
        try {
          const infoObj = await env.LIBRARY.get(`processed/${name}/info.json`);
          if (infoObj) {
            const info = JSON.parse(await infoObj.text());
            author = info.author || "";
            totalChapters = info.total_chapters || 0;
            infoStatus = info.status || "";
            if (info.progress) {
              splitCurrent = info.progress.current || 0;
              splitTotal = info.progress.total || 0;
            }
          }
        } catch {}
      }

      let status: Book["status"];
      if (metaObj) {
        status = "done";
      } else if (infoStatus === "processing") {
        status = "processing";
      } else if (processedObj) {
        status = "processed";
      } else {
        status = "raw";
      }

      books.push({
        name,
        uploaded: formatDate(obj.uploaded),
        status,
        chapters: 0,
        hasCover: !!coverObj,
        translating,
        processed: !!processedObj,
        author,
        totalChapters,
        translatedChapters,
        splitCurrent,
        splitTotal,
      });
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  return books;
}
