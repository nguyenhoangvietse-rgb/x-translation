import type { NovelMeta } from "../types";
import { escapeHtml, stripMarkdown, SHARED_CSS } from "../utils";

export function renderNovel(name: string, meta: NovelMeta): string {
  const reading = meta.chapters.filter((c) => c.id > 0);

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
    const chs = reading.filter((c) => c.volume === v.title_cn);
    if (chs.length > 0) {
      for (const c of chs) assigned.add(c.id);
      groups.push({
        volLabel: v.title_vi || v.title_cn,
        chapters: chs,
      });
    }
  }
  const rest = reading.filter((c) => !assigned.has(c.id));
  if (rest.length > 0) {
    groups.push({ chapters: rest });
  }

  // ── Build flat list with volume headers ──
  type FlatItem =
    | { type: "vol"; label: string; idx: number }
    | { type: "ch"; id: number; idx: number };
  const flat: FlatItem[] = [];
  let idx = 0;

  for (const g of groups) {
    if (g.chapters.length === 0) continue;
    if (g.volLabel) {
      flat.push({ type: "vol", label: g.volLabel, idx });
    }
    for (const c of g.chapters) {
      flat.push({ type: "ch", id: c.id, idx });
      idx++;
    }
  }

  // ── Render all items ──
  const itemsHtml = flat
    .map((item) => {
      if (item.type === "ch") {
        const c = reading.find((x) => x.id === item.id)!;
        const hasError = !c.path || c.hash?.startsWith("PENDING");
        return `<div class="ch-row" data-idx="${item.idx}" style="display:none">
          <a href="/read/${encodeURIComponent(name)}/${c.id}" style="flex:1;display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;text-decoration:none;color:#333">
            <span class="ch-num">#${c.id}</span>
            <span class="ch-title">${escapeHtml(stripMarkdown(c.translated_title || c.title))}</span>
            ${hasError ? '<span class="ch-err" title="Chương này chưa được dịch hoặc gặp lỗi">⚠ lỗi</span>' : ""}
          </a>
          <button class="btn-retranslate"
            data-name="${escapeHtml(name)}"
            data-chapter="${c.id}"
            ${hasError ? 'data-error="1"' : ""}
            title="Gửi yêu cầu dịch lại chương này">${hasError ? "Dịch lại" : "↻"}</button>
        </div>`;
      } else {
        return `<div class="vol-header" data-idx="${item.idx}" style="display:none">${escapeHtml(stripMarkdown(item.label))}</div>`;
      }
    })
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
    .intro-content { font-family: Roboto, sans-serif; font-size: .95rem; line-height: 1.8; color: #444; }
    .intro-content p { margin-bottom: .8em; white-space: pre-wrap; }
    .vol-header { font-size: 1rem; color: #4f46e5; padding: .6rem .3rem; border-bottom: 1px solid #e0e0e0; margin: 1.2rem 0 .3rem; font-weight: 600; }
    .ch-row { display: flex; align-items: center; transition: background .1s; }
    .ch-row:hover { background: #fafaff; }
    .ch-num { font-size: .75rem; color: #888; min-width: 2.5rem; }
    .ch-title { font-size: .9rem; }
    .ch-err { color: #d97706; font-size: .7rem; margin-left: .4rem; cursor: help; }
    .btn-retranslate { flex-shrink: 0; font-size: .7rem; padding: .25rem .55rem; border: 1px solid #d1d5db; border-radius: 5px; background: #fff; color: #6366f1; cursor: pointer; transition: all .15s; white-space: nowrap; margin-right: .5rem; }
    .btn-retranslate:hover { background: #eef2ff; border-color: #6366f1; }
    .btn-retranslate[data-error="1"] { color: #d97706; border-color: #fcd34d; background: #fffbeb; font-size: .72rem; padding: .3rem .6rem; }
    .btn-retranslate[data-error="1"]:hover { background: #fef3c7; border-color: #f59e0b; }
    .btn-retranslate:disabled { opacity: .4; cursor: not-allowed; }
    .toast-novel { position: fixed; top: 1rem; right: 1rem; padding: .7rem 1rem; border-radius: 6px; font-size: .85rem; color: #fff; z-index: 1000; opacity: 0; transition: opacity .3s; pointer-events: none; }
    .toast-novel.show { opacity: 1; }
    .toast-novel.ok { background: #059669; }
    .toast-novel.err { background: #dc2626; }
    .pagination-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; margin-top: 1.5rem; }
    .pagination { display: flex; gap: .35rem; flex-wrap: wrap; }
    .pagination button, .pagination .pg-num { padding: .35rem .65rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .85rem; cursor: pointer; background: #fff; color: #333; min-width: 2rem; text-align: center; }
    .pagination .active { background: #6366f1; color: #fff; border-color: #6366f1; cursor: default; }
    .pagination .ellipsis { padding: .35rem .4rem; border: none; cursor: default; background: transparent; color: #888; }
    #page-size { padding: .35rem .5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .8rem; background: #fff; color: #333; }
    #chapter-list { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: .1rem 0; }
  </style>
</head>
<body>
  <a href="/" class="back">← Thư viện</a>
  <h1>${escapeHtml(displayName)}</h1>
  ${meta.author ? `<p style="color:#888;font-size:.85rem;margin-bottom:.3rem">${escapeHtml(meta.author)}</p>` : ""}
  <p class="subtitle">${subtitle}</p>
  ${meta.translating ? '<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.85rem;color:#4338ca">⚠ Truyện đang được dịch, một số chương có thể chưa được dịch xong.</div>' : ""}
  ${introHtml}

  <div id="chapter-list">${itemsHtml}</div>

  <div id="toast-novel" class="toast-novel"></div>

  <div class="pagination-toolbar">
    <div class="pagination" id="pagination"></div>
    <select id="page-size" onchange="changePageSize(parseInt(this.value))">
      <option value="20">20 / trang</option>
      <option value="50">50 / trang</option>
      <option value="100">100 / trang</option>
      <option value="200">200 / trang</option>
    </select>
  </div>

  <script>
    var ALL_ITEMS = document.querySelectorAll('#chapter-list > *[data-idx]');
    var TOTAL_ITEMS = ${reading.length};
    var pageSize = 20;
    var currentPage = 1;
    var totalPages = 1;

    function getPage(idx) {
      return Math.floor(idx / pageSize) + 1;
    }

    function showPage(n) {
      if (n < 1 || n > totalPages) return;
      currentPage = n;
      for (var i = 0; i < ALL_ITEMS.length; i++) {
        var idx = parseInt(ALL_ITEMS[i].getAttribute('data-idx'));
        var p = getPage(idx);
        ALL_ITEMS[i].style.display = p === n ? '' : 'none';
      }
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function changePageSize(n) {
      pageSize = n;
      totalPages = Math.max(1, Math.ceil(TOTAL_ITEMS / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      showPage(currentPage);
    }

    function renderPagination() {
      var pg = document.getElementById('pagination');
      if (!pg) return;
      if (totalPages <= 1) { pg.innerHTML = ''; return; }
      var html = '';
      html += '<button onclick="showPage(currentPage-1)"' + (currentPage <= 1 ? ' disabled style="opacity:.4;cursor:default"' : '') + '>⟨</button>';
      for (var p = 1; p <= totalPages; p++) {
        if (totalPages > 8) {
          if (p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 2) {
            if (p === 2 || p === totalPages - 1) html += '<span class="ellipsis">…</span>';
            continue;
          }
        }
        html += '<span class="pg-num' + (p === currentPage ? ' active' : '') + '" onclick="showPage(' + p + ')">' + p + '</span>';
      }
      html += '<button onclick="showPage(currentPage+1)"' + (currentPage >= totalPages ? ' disabled style="opacity:.4;cursor:default"' : '') + '>⟩</button>';
      pg.innerHTML = html;
    }

    changePageSize(20);

    // ── Retranslate buttons ──
    (function() {
      var toastNv = document.getElementById('toast-novel');
      var timerNv;

      function showToast(msg, type) {
        toastNv.textContent = msg;
        toastNv.className = 'toast-novel ' + (type === 'err' ? 'err' : 'ok') + ' show';
        clearTimeout(timerNv);
        timerNv = setTimeout(function() { toastNv.classList.remove('show'); }, 3000);
      }

      document.querySelectorAll('.btn-retranslate').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var btnName = btn.getAttribute('data-name');
          var btnChapter = btn.getAttribute('data-chapter');
          btn.disabled = true;
          btn.textContent = '...';

          fetch('/api/retranslate/' + encodeURIComponent(btnName) + '/' + encodeURIComponent(btnChapter), { method: 'POST' })
            .then(function(r) {
              if (r.ok) {
                btn.textContent = '\u2713';
                btn.style.color = '#059669';
                btn.style.borderColor = '#6ee7b7';
                showToast('Đã gửi yêu cầu dịch lại chương ' + btnChapter, 'ok');
              } else {
                btn.disabled = false;
                btn.textContent = btn.hasAttribute('data-error') ? 'Dịch lại' : '↻';
                showToast('Không thể gửi yêu cầu dịch lại chương ' + btnChapter, 'err');
              }
            })
            .catch(function() {
              btn.disabled = false;
              btn.textContent = btn.hasAttribute('data-error') ? 'Dịch lại' : '↻';
              showToast('Lỗi kết nối', 'err');
            });
        });
      });
    })();
  </script>
</body>
</html>`;
}
