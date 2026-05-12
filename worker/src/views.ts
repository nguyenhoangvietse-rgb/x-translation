import type { Book, Chapter, Novel, NovelMeta } from "./types";
import { escapeHtml, SHARED_CSS, statusBadge } from "./utils";

export function renderLibrary(novels: Novel[]): string {
  const items = novels.length === 0
    ? `<div class="empty">Chưa có truyện nào được dịch.</div>`
    : novels
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(n => `
          <a href="/read/${encodeURIComponent(n.name)}" class="novel-card">
            <div class="novel-cover">${n.name.charAt(0)}</div>
            <div class="novel-name">${escapeHtml(n.name)}</div>
            <div class="novel-meta">${n.chapterCount} chương</div>
          </a>`)
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

export function renderNovel(name: string, meta: NovelMeta, introContent: string | null): string {
  const intro = meta.chapters.find(c => c.id === 0);
  const reading = meta.chapters.filter(c => c.id > 0);

  const introHtml = intro && introContent
    ? `<div class="intro-card">
         <h3>${escapeHtml(intro.title)}</h3>
         <div class="intro-content">
           ${introContent.split(/\n{2,}/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join("")}
         </div>
       </div>`
    : "";

  const chapterList = reading
    .map(c => `
      <li>
        <a href="/read/${encodeURIComponent(name)}/${c.id}">
          <span class="ch-num">#${c.id}</span>
          <span class="ch-title">${escapeHtml(c.title)}</span>
        </a>
      </li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(name)} — Chapters</title>
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
  <h1>${escapeHtml(name)}</h1>
  <p class="subtitle">${reading.length} chương</p>
  ${introHtml}
  <ol>${chapterList || `<div class="empty">Chưa có chương nào được dịch.</div>`}</ol>
</body>
</html>`;
}

export function renderChapter(name: string, ch: Chapter, meta: NovelMeta, content: string): string {
  const reading = meta.chapters.filter(c => c.id > 0);
  const currentIdx = reading.findIndex(c => c.id === ch.id);
  const prev = currentIdx > 0 ? reading[currentIdx - 1] : null;
  const next = currentIdx < reading.length - 1 ? reading[currentIdx + 1] : null;

  const paraList = content.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  const chapterTitle = paraList.length > 0 ? paraList[0] : ch.title;
  const bodyParas = paraList.slice(1);

  const paragraphs = bodyParas.map(p => `<p>${escapeHtml(p)}</p>`).join("\n");

  const navOptions = reading
    .map(c => {
      const title = c.id === ch.id ? chapterTitle : c.title;
      return `<option value="${c.id}"${c.id === ch.id ? " selected" : ""}>Chương ${c.id}: ${escapeHtml(title)}</option>`;
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
  <title>Chương ${ch.id}: ${escapeHtml(chapterTitle)} — ${escapeHtml(name)}</title>
  ${SHARED_CSS}
  <style>
    body { max-width: 720px; margin: 0 auto; padding: 1rem 1rem 2rem; }
    .back { font-size: .85rem; margin-bottom: 1rem; display: inline-block; }
    .nav-bar { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
    h1 { font-size: 1.3rem; color: #1a1a2e; margin-bottom: 1.5rem; }
    .content { font-family: Roboto, sans-serif; font-size: 1.1rem; line-height: 1.9; color: #222; }
    .content p { margin-bottom: 1em; }
    @media (max-width: 500px) { .nav-bar { flex-direction: column; gap: .5rem; } .nav-bar select { max-width: 100%; width: 100%; } }
  </style>
</head>
<body>
  <a href="/read/${encodeURIComponent(name)}" class="back">← ${escapeHtml(name)}</a>

  ${navBar(true)}

  <h1>Chương ${ch.id}: ${escapeHtml(chapterTitle)}</h1>

  <div class="content">
    ${paragraphs}
  </div>

  ${navBar(false)}
</body>
</html>`;
}

export function renderAdminTable(books: Book[]): string {
  if (books.length === 0) {
    return `<div class="empty">No books uploaded yet. Drop a .txt file above to get started.</div>`;
  }
  return `
<table style="width:100%;border-collapse:collapse">
  <thead><tr><th style="text-align:left;font-weight:600;color:#666;font-size:.8rem;text-transform:uppercase;letter-spacing:.5px;padding:.6rem .8rem;border-bottom:2px solid #eee">Name</th><th style="text-align:left;font-weight:600;color:#666;font-size:.8rem;text-transform:uppercase;letter-spacing:.5px;padding:.6rem .8rem;border-bottom:2px solid #eee">Status</th><th style="text-align:left;font-weight:600;color:#666;font-size:.8rem;text-transform:uppercase;letter-spacing:.5px;padding:.6rem .8rem;border-bottom:2px solid #eee">Uploaded</th><th style="text-align:left;font-weight:600;color:#666;font-size:.8rem;text-transform:uppercase;letter-spacing:.5px;padding:.6rem .8rem;border-bottom:2px solid #eee">Actions</th></tr></thead>
  <tbody>
    ${books.sort((a, b) => b.uploaded.localeCompare(a.uploaded)).map(b => `
      <tr>
        <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0;font-size:.9rem"><strong>${escapeHtml(b.name)}</strong></td>
        <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0">${statusBadge(b.status)}</td>
        <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0;color:#888;font-size:.8rem">${escapeHtml(b.uploaded)}</td>
        <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0">
          <button class="btn btn-outline" hx-post="/api/translate/${encodeURIComponent(b.name)}" hx-swap="outerHTML" hx-target="closest tr">Dịch lại</button>
        </td>
      </tr>`).join("")}
  </tbody>
</table>`;
}

export const ADMIN_PAGE = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin — Translation Library</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  ${SHARED_CSS}
  <style>
    body { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    h1 { font-size: 1.4rem; margin-bottom: 1.5rem; color: #1a1a2e; }
    .card { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .card h2 { font-size: 1rem; margin-bottom: 1rem; color: #444; }
    .drop-zone { border: 2px dashed #ccc; border-radius: 8px; padding: 2rem; text-align: center; transition: border-color .2s, background .2s; cursor: pointer; }
    .drop-zone.dragover { border-color: #6366f1; background: #eef2ff; }
    .drop-zone p { color: #888; font-size: .9rem; }
    .drop-zone p strong { color: #6366f1; }
    input[type=file] { display: none; }
    .progress { display: none; margin-top: .8rem; }
    .progress.htmx-request { display: block; }
    .bar { height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; margin-bottom: .4rem; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 3px; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100% { width: 30%; } 50% { width: 90%; } }
  </style>
</head>
<body>
  <h1>Admin — Translation Library</h1>

  <div class="card">
    <h2>Upload New Book</h2>
    <form hx-post="/api/upload" hx-encoding="multipart/form-data" hx-swap="outerHTML" hx-target="#book-list" hx-indicator="#upload-progress">
      <div class="drop-zone" id="drop-zone">
        <p>Drop <strong>.txt</strong> file here or <strong>click to browse</strong> (max 10 MB)</p>
        <input type="file" name="file" id="file-input" accept=".txt" />
      </div>
      <div class="progress" id="upload-progress">
        <div class="bar"><div class="bar-fill"></div></div>
        <p style="font-size:.8rem;color:#888">Uploading and dispatching translation...</p>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Books</h2>
    <div id="book-list" hx-get="/api/books" hx-trigger="load, every 30s" hx-swap="innerHTML"></div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const toast = document.getElementById("toast");

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault(); dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event("change")); }
    });
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) {
        const f = fileInput.files[0];
        if (!f.name.toLowerCase().endsWith(".txt")) { showToast("Only .txt files allowed", "error"); return; }
        if (f.size > 10 * 1024 * 1024) { showToast("File exceeds 10 MB limit", "error"); return; }
        fileInput.form.requestSubmit();
      }
    });
    document.body.addEventListener("htmx:afterOnLoad", (e: any) => {
      const el = e.detail.elt;
      const msg = el.getAttribute("data-toast");
      const type = el.getAttribute("data-toast-type");
      if (msg) showToast(msg, type);
    });
    function showToast(msg: string, type: string) {
      toast.textContent = msg;
      toast.className = "toast toast-" + (type === "error" ? "error" : "success") + " show";
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  </script>
</body>
</html>`;
