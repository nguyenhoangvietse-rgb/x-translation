import type { Novel } from "../types";
import { escapeHtml, SHARED_CSS, FIREBASE_HEAD } from "../utils";

export function renderLibrary(
  novels: Novel[],
  progress: Record<string, { chapter: number; updatedAt: string }> = {},
): string {
  // ── Continue reading ──
  const readingEntries = Object.entries(progress)
    .filter(([name]) => novels.some((n) => n.name === name))
    .sort(
      (a, b) =>
        new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime(),
    )
    .slice(0, 6);

  const continueHtml =
    readingEntries.length === 0
      ? ""
      : `
    <section class="continue-section">
      <h2>Tiếp tục đọc</h2>
      <div class="continue-grid">
        ${readingEntries
          .map(([novelName, p]) => {
            const novel = novels.find((n) => n.name === novelName);
            const display = novel?.displayName || novelName;
            const initial = display.charAt(0);
            return `<a href="/read/${encodeURIComponent(novelName)}/${p.chapter}" class="continue-card">
            <div class="continue-cover">${escapeHtml(initial)}</div>
            <div class="continue-info">
              <div class="continue-name">${escapeHtml(display)}</div>
              <div class="continue-ch">Chương ${p.chapter}</div>
            </div>
          </a>`;
          })
          .join("")}
      </div>
    </section>`;

  // ── All novels ──
  const items =
    novels.length === 0
      ? `<div class="empty">Chưa có truyện nào được dịch.</div>`
      : novels
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((n) => {
            const displayName = n.displayName || n.name;
            const initial = displayName.charAt(0);
            const coverHtml = n.hasCover
              ? `<img class="novel-cover" src="/cover/${encodeURIComponent(n.name)}" alt="" style="object-fit:cover">`
              : `<div class="novel-cover">${escapeHtml(initial)}</div>`;
            const prog = progress[n.name];
            return `
          <a href="/read/${encodeURIComponent(n.name)}${prog ? "/" + prog.chapter : ""}" class="novel-card">
            ${coverHtml}
            <div class="novel-name" title="${escapeHtml(n.name)}">${escapeHtml(displayName)}</div>
            ${n.author ? `<div style="font-size:.7rem;color:#aaa;text-align:center;margin-top:.1rem">${escapeHtml(n.author)}</div>` : ""}
            <div class="novel-meta">${n.chapterCount} chương${prog ? `<span style="color:#6366f1;font-size:.7rem"> · Đến ${prog.chapter}</span>` : ""}${n.translating ? '<span style="color:#6366f1;font-size:.7rem"> · Đang dịch</span>' : ""}</div>
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
  ${FIREBASE_HEAD}
  <style>
    body { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
    header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    header h1 { font-size: 1.4rem; color: #1a1a2e; }
    header nav a { font-size: .85rem; margin-left: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
    .novel-card { display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: 10px; padding: 1.5rem 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); transition: transform .15s, box-shadow .15s; text-decoration: none; color: inherit; }
    .novel-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.12); text-decoration: none; }
    .novel-cover { width: 90px; height: 120px; border-radius: 6px; background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; margin-bottom: .75rem; }
    .novel-name { font-size: .9rem; font-weight: 600; text-align: center; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .novel-meta { font-size: .75rem; color: #888; margin-top: .35rem; }
    @media (max-width: 480px) { .grid { grid-template-columns: 1fr; } .continue-grid { grid-template-columns: 1fr; } }
    .continue-section { margin-bottom: 2rem; }
    .continue-section h2 { font-size: 1rem; color: #444; margin-bottom: .75rem; }
    .continue-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: .5rem; }
    .continue-card { display: flex; align-items: center; gap: .75rem; background: #fff; border-radius: 8px; padding: .75rem 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.06); text-decoration: none; color: inherit; transition: box-shadow .15s; }
    .continue-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.1); text-decoration: none; }
    .continue-cover { width: 40px; height: 52px; border-radius: 4px; background: linear-gradient(135deg,#6366f1,#818cf8); color:#fff; display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:700; flex-shrink:0; }
    .continue-name { font-size: .85rem; font-weight: 600; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .continue-ch { font-size: .72rem; color: #6366f1; margin-top: .15rem; }
  </style>
</head>
<body>
  <header>
    <h1>Translation Library</h1>
    <nav><button id="auth-btn" class="btn btn-outline">🔑 Đăng nhập</button><a href="/admin">Admin</a></nav>
  </header>
  ${continueHtml}
  <div class="grid">${items}</div>
</body>
</html>`;
}
