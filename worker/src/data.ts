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

        const hasIntro = meta.chapters.some(c => c.id === 0);
        let displayName: string | undefined;

        if (hasIntro) {
          const ch0 = await env.LIBRARY.get(`translated/${name}/chapter_0.txt`);
          if (ch0) {
            const body = (await ch0.text()).split(/\n{2,}/)[1];
            if (body) {
              displayName = body.trim().split(/\n/)[0]?.trim().slice(0, 80);
            }
          }
        }

        let hasCover = false;
        try {
          hasCover = !!(await env.LIBRARY.head(`processed/${name}/cover`));
        } catch {}

        novels.push({
          name,
          chapterCount: meta.chapters.filter(c => c.id > 0).length,
          hasIntro,
          displayName,
          hasCover,
          translating: meta.translating,
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

export async function getChapterText(env: Env, name: string, id: number): Promise<string | null> {
  try {
    const obj = await env.LIBRARY.get(`translated/${name}/chapter_${id}.txt`);
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
