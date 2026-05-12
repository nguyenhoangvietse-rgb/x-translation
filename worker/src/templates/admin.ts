import type { Book } from "../types";
import { escapeHtml, SHARED_CSS, statusBadge } from "../utils";

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
  <a href="/" style="font-size:.85rem;display:inline-block;margin-bottom:1rem">← Thư viện</a>
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
