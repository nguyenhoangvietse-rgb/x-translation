import type { NovelMeta } from "../types";
import { escapeHtml, SHARED_CSS } from "../utils";

export function renderNovel(name: string, meta: NovelMeta): string {
  const reading = meta.chapters.filter(c => c.id > 0);

  const displayName = meta.story_name || name;

  const volMap = new Map<string, string>();
  for (const v of meta.volumes || []) {
    volMap.set(v.title_cn, v.title_vi);
  }

  const subtitle = meta.total_chapters
    ? `${reading.length} / ${meta.total_chapters} chương`
    : `${reading.length} chương`;

  const introHtml = meta.intro
    ? `<div class="intro-card">
         <div class="intro-content"><p>${escapeHtml(meta.intro)}</p></div>
       </div>`
    : "";

  const chapterList = reading
    .map(c => `
      <li style="display:flex;align-items:center">
        <a href="/read/${encodeURIComponent(name)}/${c.id}" style="flex:1;display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;text-decoration:none;color:#333">
          <span class="ch-num">#${c.id}</span>
          <span class="ch-title">${c.volume ? `${escapeHtml(volMap.get(c.volume) || c.volume)} · ` : ''}${escapeHtml(c.translated_title || c.title)}</span>
          ${(!c.path || c.hash?.startsWith('PENDING')) ? '<span style="color:#f59e0b;font-size:.65rem;margin-left:.4rem">(lỗi)</span>' : ''}
        </a>
        ${!meta.translating
          ? `<button onclick="fetch('/api/retranslate/${encodeURIComponent(name)}/${c.id}',{method:'POST'}).then(r=>r.ok&&(this.textContent='Đã gửi'))"
            style="border:none;background:none;color:#6366f1;font-size:.65rem;cursor:pointer;padding:.2rem .5rem;white-space:nowrap">Dịch lại</button>`
          : ''}
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
    .intro-content p { margin-bottom: .8em; white-space: pre-wrap; }
    ol { list-style: none; display: flex; flex-direction: column; gap: 1px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    li a { transition: background .1s; }
    li a:hover { background: #fafaff; }
    .ch-num { font-size: .75rem; color: #888; min-width: 2rem; }
    .ch-title { font-size: .9rem; }
  </style>
</head>
<body>
  <a href="/" class="back">← Thư viện</a>
  <h1>${escapeHtml(displayName)}</h1>
  ${meta.author ? `<p style="color:#888;font-size:.85rem;margin-bottom:.3rem">${escapeHtml(meta.author)}</p>` : ''}
  <p class="subtitle">${subtitle}</p>
  ${meta.translating ? '<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.85rem;color:#4338ca">⚠ Truyện đang được dịch, một số chương có thể chưa được dịch xong.</div>' : ''}
  ${introHtml}
  <ol>${chapterList || `<div class="empty">Chưa có chương nào được dịch.</div>`}</ol>
</body>
</html>`;
}
