import type { NovelMeta } from "../types";
import { escapeHtml, SHARED_CSS } from "../utils";

export function renderNovel(name: string, meta: NovelMeta, introContent: string | null): string {
  const intro = meta.chapters.find(c => c.id === 0);
  const reading = meta.chapters.filter(c => c.id > 0);

  const displayName = introContent
    ? introContent.split(/\n{2,}/)[1]?.trim().split(/\n/)[0]?.trim().slice(0, 80) || name
    : name;

  const introHtml = intro && introContent
    ? (() => {
        const introParas = introContent.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
        const introBody = introParas.slice(1).map(p => `<p>${escapeHtml(p)}</p>`).join("");
        return `<div class="intro-card">
         <h3>${escapeHtml(intro.title)}</h3>
         <div class="intro-content">${introBody}</div>
       </div>`;
      })()
    : "";

  const chapterList = reading
    .map(c => `
      <li>
        <a href="/read/${encodeURIComponent(name)}/${c.id}">
          <span class="ch-num">#${c.id}</span>
          <span class="ch-title">${escapeHtml(c.translated_title || c.title)}</span>
        </a>
      </li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(displayName)} — Chapters</title>
  ${SHARED_CSS}
  <style>
    body { max-width: 720px; margin: 0 auto; padding: 2rem 1rem; }
    .back { font-size: .85rem; margin-bottom: 1.5rem; display: inline-block; }
    h1 { font-size: 1.5rem; margin-bottom: .3rem; color: #1a1a2e; }
    .subtitle { color: #888; font-size: .85rem; margin-bottom: 1.5rem; }
    .intro-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.2rem 1.2rem; margin-bottom: 1.5rem; }
    .intro-card h3 { font-size: 1rem; color: #1a1a2e; margin-bottom: .8rem; }
    .intro-content { font-family: Roboto, sans-serif; font-size: .95rem; line-height: 1.8; color: #444; }
    .intro-content p { margin-bottom: .8em; }
    ol { list-style: none; display: flex; flex-direction: column; gap: 1px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    li a { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; background: #fff; text-decoration: none; color: #333; transition: background .1s; }
    li a:hover { background: #fafaff; text-decoration: none; }
    .ch-num { font-size: .75rem; color: #888; min-width: 2rem; }
    .ch-title { font-size: .9rem; }
  </style>
</head>
<body>
  <a href="/" class="back">← Thư viện</a>
  <h1>${escapeHtml(displayName)}</h1>
  <p class="subtitle">${reading.length} chương</p>
  ${introHtml}
  <ol>${chapterList || `<div class="empty">Chưa có chương nào được dịch.</div>`}</ol>
</body>
</html>`;
}
