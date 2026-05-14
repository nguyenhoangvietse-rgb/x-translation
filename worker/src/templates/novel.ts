import type { NovelMeta } from "../types";
import { escapeHtml, SHARED_CSS } from "../utils";

const PAGE_SIZE = 50;

export function renderNovel(name: string, meta: NovelMeta): string {
  const reading = meta.chapters.filter(c => c.id > 0);

  const displayName = meta.story_name || name;

  const subtitle = meta.total_chapters
    ? `${reading.length} / ${meta.total_chapters} chương`
    : `${reading.length} chương`;

  const introHtml = meta.intro
    ? `<div class="intro-card">
         <div class="intro-content"><p>${escapeHtml(meta.intro)}</p></div>
       </div>`
    : "";

  // ── Build volume groups ──
  const volOrder = meta.volumes || [];
  const assigned = new Set<number>();
  const groups: { volLabel?: string; chapters: typeof reading }[] = [];

  for (const v of volOrder) {
    const chs = reading.filter(c => c.volume === v.title_cn);
    if (chs.length > 0) {
      for (const c of chs) assigned.add(c.id);
      groups.push({
        volLabel: v.title_vi || v.title_cn,
        chapters: chs,
      });
    }
  }
  const rest = reading.filter(c => !assigned.has(c.id));
  if (rest.length > 0) {
    groups.push({ chapters: rest });
  }

  // ── Build flat list with volume headers ──
  type FlatItem = { type: "vol"; label: string; page: number } | { type: "ch"; id: number; page: number };
  const flat: FlatItem[] = [];
  let count = 0;

  for (const g of groups) {
    if (g.chapters.length === 0) continue;
    const firstPage = Math.floor(count / PAGE_SIZE) + 1;
    if (g.volLabel) {
      flat.push({ type: "vol", label: g.volLabel, page: firstPage });
    }
    for (const c of g.chapters) {
      const page = Math.floor(count / PAGE_SIZE) + 1;
      flat.push({ type: "ch", id: c.id, page });
      count++;
    }
  }
  const totalPages = count > 0 ? Math.floor((count - 1) / PAGE_SIZE) + 1 : 0;

  // ── Render all items ──
  const itemsHtml = flat
    .map((item) => {
      if (item.type === "ch") {
        const c = reading.find(x => x.id === item.id)!;
        return `<div class="ch-row" data-page="${item.page}" style="display:none">
          <a href="/read/${encodeURIComponent(name)}/${c.id}" style="flex:1;display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;text-decoration:none;color:#333">
            <span class="ch-num">#${c.id}</span>
            <span class="ch-title">${escapeHtml(c.translated_title || c.title)}</span>
            ${(!c.path || c.hash?.startsWith('PENDING')) ? '<span style="color:#f59e0b;font-size:.65rem;margin-left:.4rem">(lỗi)</span>' : ''}
          </a>
          ${!meta.translating
            ? `<button onclick="fetch('/api/retranslate/${encodeURIComponent(name)}/${c.id}',{method:'POST'}).then(r=>r.ok&&(this.textContent='Đã gửi'))"
              style="border:none;background:none;color:#6366f1;font-size:.65rem;cursor:pointer;padding:.2rem .5rem;white-space:nowrap">Dịch lại</button>`
            : ''}
        </div>`;
      } else {
        return `<div class="vol-header" data-page="${item.page}" style="display:none">${escapeHtml(item.label)}</div>`;
      }
    })
    .join("");

  const paginationHtml = totalPages > 1
    ? `<div class="pagination" id="pagination"></div>`
    : "";

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
    .intro-content { font-family: Roboto, sans-serif; font-size: .95rem; line-height: 1.8; color: #444; }
    .intro-content p { margin-bottom: .8em; white-space: pre-wrap; }
    .vol-header { font-size: 1rem; color: #4f46e5; padding: .6rem 0 .3rem; border-bottom: 1px solid #e0e0e0; margin: 1.2rem 0 .3rem; font-weight: 600; }
    .ch-row { display: flex; align-items: center; transition: background .1s; }
    .ch-row:hover { background: #fafaff; }
    .ch-num { font-size: .75rem; color: #888; min-width: 2.5rem; }
    .ch-title { font-size: .9rem; }
    .pagination { display: flex; gap: .35rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap; }
    .pagination button, .pagination .pg-num { padding: .35rem .65rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .85rem; cursor: pointer; background: #fff; color: #333; min-width: 2rem; text-align: center; }
    .pagination .active { background: #6366f1; color: #fff; border-color: #6366f1; cursor: default; }
    .pagination .ellipsis { padding: .35rem .4rem; border: none; cursor: default; background: transparent; color: #888; }
    #chapter-list { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: .1rem 0; }
  </style>
</head>
<body>
  <a href="/" class="back">← Thư viện</a>
  <h1>${escapeHtml(displayName)}</h1>
  ${meta.author ? `<p style="color:#888;font-size:.85rem;margin-bottom:.3rem">${escapeHtml(meta.author)}</p>` : ''}
  <p class="subtitle">${subtitle}</p>
  ${meta.translating ? '<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.85rem;color:#4338ca">⚠ Truyện đang được dịch, một số chương có thể chưa được dịch xong.</div>' : ''}
  ${introHtml}

  <div id="chapter-list">${itemsHtml}</div>
  ${paginationHtml}

  <script>
    var TOTAL_PAGES = ${totalPages};
    var ALL_ITEMS = document.querySelectorAll('#chapter-list > *[data-page]');

    function showPage(n) {
      if (n < 1 || n > TOTAL_PAGES) return;
      for (var i = 0; i < ALL_ITEMS.length; i++) {
        var p = parseInt(ALL_ITEMS[i].getAttribute('data-page'));
        ALL_ITEMS[i].style.display = p === n ? '' : 'none';
      }
      renderPagination(n);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderPagination(cur) {
      var pg = document.getElementById('pagination');
      if (!pg) return;
      var html = '';
      html += '<button onclick="showPage(' + (cur-1) + ')"' + (cur <= 1 ? ' disabled style="opacity:.4;cursor:default"' : '') + '>⟨</button>';
      for (var p = 1; p <= TOTAL_PAGES; p++) {
        if (TOTAL_PAGES > 8) {
          if (p !== 1 && p !== TOTAL_PAGES && Math.abs(p - cur) > 2) {
            if (p === 2 || p === TOTAL_PAGES - 1) html += '<span class="ellipsis">…</span>';
            continue;
          }
        }
        html += '<span class="pg-num' + (p === cur ? ' active' : '') + '" onclick="showPage(' + p + ')">' + p + '</span>';
      }
      html += '<button onclick="showPage(' + (cur+1) + ')"' + (cur >= TOTAL_PAGES ? ' disabled style="opacity:.4;cursor:default"' : '') + '>⟩</button>';
      pg.innerHTML = html;
    }

    showPage(1);
  </script>
</body>
</html>`;
}
