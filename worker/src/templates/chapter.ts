import type { Chapter, NovelMeta } from "../types";
import { escapeHtml, SHARED_CSS } from "../utils";

export function renderChapter(name: string, ch: Chapter, meta: NovelMeta, content: string): string {
  const reading = meta.chapters.filter(c => c.id > 0);
  const currentIdx = reading.findIndex(c => c.id === ch.id);
  const prev = currentIdx > 0 ? reading[currentIdx - 1] : null;
  const next = currentIdx < reading.length - 1 ? reading[currentIdx + 1] : null;

  const paraList = content.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  const chapterTitle = ch.translated_title || (paraList.length > 0 ? paraList[0] : ch.title);
  const bodyParas = paraList.slice(1);

  const paragraphs = bodyParas.map(p => `<p">${escapeHtml(p)}</p>`).join("\n");

  const navOptions = reading
    .map(c => {
      const label = `${c.volume ? c.volume + " · " : ""}${escapeHtml(c.translated_title || c.title)}`;
      if (c.id === ch.id) {
        return `<option value="${c.id}" selected>${label}</option>`;
      }
      return `<option value="${c.id}">${label}</option>`;
    })
    .join("");

  const navBar = (top: boolean) => `
    <div class="nav-bar" style="margin-bottom:${top ? "1.5rem" : "0"};margin-top:${top ? "0" : "2rem"}">
      ${prev
        ? `<a href="/read/${encodeURIComponent(name)}/${prev.id}" class="btn btn-outline">← Trước</a>`
        : `<span class="btn btn-outline" style="opacity:.4;cursor:default">← Trước</span>`}

      <select onchange="if(this.value)window.location='/read/${encodeURIComponent(name)}/'+this.value" style="padding:.45rem .6rem;border-radius:6px;border:1px solid #d1d5db;font-size:.85rem;max-width:260px">
        ${navOptions}
      </select>

      ${next
        ? `<a href="/read/${encodeURIComponent(name)}/${next.id}" class="btn btn-outline">Sau →</a>`
        : `<span class="btn btn-outline" style="opacity:.4;cursor:default">Sau →</span>`}
    </div>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(chapterTitle)} — ${escapeHtml(meta.story_name || name)}</title>
  ${SHARED_CSS}
  <style>
    body { max-width: 720px; margin: 0 auto; padding: 1rem 1rem 2rem; }
    .back { font-size: .85rem; margin-bottom: 1rem; display: inline-block; }
    .nav-bar { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
    h1 { font-size: 1.3rem; color: #1a1a2e; margin-bottom: 1.5rem; }
    .content { font-family: Roboto, sans-serif; font-size: 1.1rem; line-height: 1.9; color: #222; }
    .content p { margin-bottom: 1em; white-space: pre-wrap; }
    @media (max-width: 500px) { .nav-bar { flex-direction: column; gap: .5rem; } .nav-bar select { max-width: 100%; width: 100%; } }
  </style>
</head>
<body>
  <a href="/read/${encodeURIComponent(name)}" class="back">← ${escapeHtml(meta.story_name || name)}</a>

  ${navBar(true)}

  <h1>${escapeHtml(chapterTitle)}</h1>

  <div class="content">
    ${paragraphs}
  </div>

  ${navBar(false)}
</body>
</html>`;
}
