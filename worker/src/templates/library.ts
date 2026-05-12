import type { Novel } from "../types";
import { escapeHtml, SHARED_CSS } from "../utils";

export function renderLibrary(novels: Novel[]): string {
  const items = novels.length === 0
    ? `<div class="empty">Chưa có truyện nào được dịch.</div>`
    : novels
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(n => {
          const displayName = n.displayName || n.name;
          const initial = displayName.charAt(0);
          return `
          <a href="/read/${encodeURIComponent(n.name)}" class="novel-card">
            <div class="novel-cover">${escapeHtml(initial)}</div>
            <div class="novel-name" title="${escapeHtml(n.name)}">${escapeHtml(displayName)}</div>
            <div class="novel-meta">${n.chapterCount} chương</div>
          </a>`;
        })
        .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Translation Library</title>
  ${SHARED_CSS}
  <style>
    body { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
    header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    header h1 { font-size: 1.4rem; color: #1a1a2e; }
    header nav a { font-size: .85rem; margin-left: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
    .novel-card { display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: 10px; padding: 1.5rem 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); transition: transform .15s, box-shadow .15s; text-decoration: none; color: inherit; }
    .novel-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.12); text-decoration: none; }
    .novel-cover { width: 64px; height: 64px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; margin-bottom: .75rem; }
    .novel-name { font-size: .9rem; font-weight: 600; text-align: center; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .novel-meta { font-size: .75rem; color: #888; margin-top: .35rem; }
    @media (max-width: 480px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>Translation Library</h1>
    <nav><a href="/admin">Admin</a></nav>
  </header>
  <div class="grid">${items}</div>
</body>
</html>`;
}
