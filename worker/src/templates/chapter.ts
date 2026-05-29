import type { Chapter, NovelMeta } from "../types";
import { escapeHtml, stripMarkdown, SHARED_CSS, FIREBASE_HEAD } from "../utils";

export function renderChapter(
  name: string,
  ch: Chapter,
  meta: NovelMeta,
  content: string,
): string {
  const reading = meta.chapters.filter((c) => c.id > 0);
  const currentIdx = reading.findIndex((c) => c.id === ch.id);
  const prev = currentIdx > 0 ? reading[currentIdx - 1] : null;
  const next = currentIdx < reading.length - 1 ? reading[currentIdx + 1] : null;

  const paraList = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const chapterTitle = stripMarkdown(
    ch.translated_title || (paraList.length > 0 ? paraList[0] : ch.title),
  );
  const bodyParas = paraList.slice(1);

  const paragraphs = bodyParas
    .map((p) => `<p">${escapeHtml(p)}</p>`)
    .join("\n");

  const navOptions = reading
    .map((c) => {
      const label = `${escapeHtml(stripMarkdown(c.translated_title || c.title))}`;
      if (c.id === ch.id) {
        return `<option value="${c.id}" selected>${label}</option>`;
      }
      return `<option value="${c.id}">${label}</option>`;
    })
    .join("");

  const navBar = (top: boolean) => `
    <div class="nav-bar" style="margin-bottom:${top ? "1.5rem" : "0"};margin-top:${top ? "0" : "2rem"}">
      ${
        prev
          ? `<a href="/read/${encodeURIComponent(name)}/${prev.id}" class="btn btn-outline">← Trước</a>`
          : `<span class="btn btn-outline" style="opacity:.4;cursor:default">← Trước</span>`
      }

      <select onchange="if(this.value)window.location='/read/${encodeURIComponent(name)}/'+this.value" style="padding:.45rem .6rem;border-radius:6px;border:1px solid #d1d5db;font-size:.85rem;max-width:260px">
        ${navOptions}
      </select>

      ${
        next
          ? `<a href="/read/${encodeURIComponent(name)}/${next.id}" class="btn btn-outline">Sau →</a>`
          : `<span class="btn btn-outline" style="opacity:.4;cursor:default">Sau →</span>`
      }
    </div>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(chapterTitle)} — ${escapeHtml(meta.story_name || name)}</title>
  ${SHARED_CSS}
  ${FIREBASE_HEAD}
  <style>
    body { max-width: 720px; margin: 0 auto; padding: 1rem 1rem 2rem; }
    .back { font-size: .85rem; margin-bottom: 1rem; display: inline-block; }
    .nav-bar { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
    h1 { font-size: 1.3rem; color: #1a1a2e; margin-bottom: 1.5rem; }
    .content { font-family: Roboto, sans-serif; font-size: 1.1rem; line-height: 1.9; color: #222; white-space: pre-wrap; }
    .content p { margin-bottom: 1em;}
    .btn-retranslate-ch { font-size: .75rem; padding: .35rem .8rem; border: 1px solid #d1d5db; border-radius: 5px; background: #fff; color: #888; cursor: pointer; transition: all .15s; }
    .btn-retranslate-ch:hover { color: #6366f1; border-color: #6366f1; background: #eef2ff; }
    .btn-retranslate-ch:disabled { opacity: .4; cursor: not-allowed; }
    .toast-ch { position: fixed; top: 1rem; right: 1rem; padding: .7rem 1rem; border-radius: 6px; font-size: .85rem; color: #fff; z-index: 1000; opacity: 0; transition: opacity .3s; pointer-events: none; }
    .toast-ch.show { opacity: 1; }
    .toast-ch.ok { background: #059669; }
    .toast-ch.err { background: #dc2626; }
    @media (max-width: 500px) { .nav-bar { flex-direction: column; gap: .5rem; } .nav-bar select { max-width: 100%; width: 100%; } }
    .reader-footer { max-width: 720px; margin: 1.5rem auto 0; padding: 1rem; display: flex; align-items: center; justify-content: center; gap: .5rem; flex-wrap: wrap; border-top: 1px solid #e5e7eb; }
    .reader-footer code { font-family: monospace; background: #f3f4f6; padding: .15rem .4rem; border-radius: 3px; font-size: .75rem; }
  </style>
</head>
<body>
  <a href="/read/${encodeURIComponent(name)}" class="back">← ${escapeHtml(meta.story_name || name)}</a>
  <button id="auth-btn" class="btn btn-outline" style="float:right;margin-top:-.2rem;font-size:.75rem">🔑 Đăng nhập</button>

  ${navBar(true)}

  <h1>${escapeHtml(chapterTitle)}</h1>

  <div class="content">
    ${paragraphs}
  </div>

  <div style="text-align:center;margin:1.5rem 0">
    <button class="btn-retranslate-ch" data-name="${escapeHtml(name)}" data-chapter="${ch.id}">
      ↻ Dịch lại chương này
    </button>
  </div>

  ${navBar(false)}
  <div id="toast-ch" class="toast-ch"></div>
  <script>
  // ── Save reading progress ──
  var uid = document.cookie.match(/reader_uid=([a-zA-Z0-9]+)/);
  var uidHeader = uid ? uid[1] : '';
  if (uidHeader) {
    fetch('/api/progress/${encodeURIComponent(name)}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Reader-UID': uidHeader },
      body: JSON.stringify({ chapter: ${ch.id} })
    });
  }

  // ── Retranslate button ──
    var toastCh = document.getElementById('toast-ch');
    var timerCh;
    function show(msg, type) {
      toastCh.textContent = msg;
      toastCh.className = 'toast-ch ' + (type === 'err' ? 'err' : 'ok') + ' show';
      clearTimeout(timerCh);
      timerCh = setTimeout(function() { toastCh.classList.remove('show'); }, 3000);
    }
    var btnCh = document.querySelector('.btn-retranslate-ch');
    if (btnCh) {
      btnCh.addEventListener('click', function() {
        var chName = btnCh.getAttribute('data-name');
        var chId = btnCh.getAttribute('data-chapter');
        btnCh.disabled = true;
        btnCh.textContent = 'Đang gửi...';
        fetch('/api/retranslate/' + encodeURIComponent(chName) + '/' + chId, { method: 'POST' })
          .then(function(r) {
            if (r.ok) { btnCh.textContent = '✓ Đã gửi'; show('Đã gửi yêu cầu dịch lại chương ' + chId, 'ok'); }
            else { btnCh.disabled = false; btnCh.textContent = '↻ Dịch lại chương này'; show('Gửi thất bại', 'err'); }
          })
          .catch(function() { btnCh.disabled = false; btnCh.textContent = '↻ Dịch lại chương này'; show('Lỗi kết nối', 'err'); });
      });
    }
  </script>
</body>
</html>`;
}
