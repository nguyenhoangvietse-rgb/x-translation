export interface Env {
  LIBRARY: R2Bucket;
  GITHUB_TOKEN: string;
  OWNER: string;
  REPO: string;
}

interface Book {
  name: string;
  uploaded: string;
  status: "done" | "pending";
  chapters: number;
}

function html(strings: TemplateStringsArray, ...values: (string | number)[]) {
  return String.raw({ raw: strings }, ...values);
}

const PAGE = html`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Translation Library</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; color: #1a1a2e; }
    .card { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #444; }
    .drop-zone {
      border: 2px dashed #ccc; border-radius: 8px; padding: 2rem; text-align: center;
      transition: border-color .2s, background .2s; cursor: pointer;
    }
    .drop-zone.dragover { border-color: #6366f1; background: #eef2ff; }
    .drop-zone p { color: #888; font-size: .9rem; }
    .drop-zone p strong { color: #6366f1; }
    input[type=file] { display: none; }
    .progress { display: none; margin-top: .8rem; }
    .progress.htmx-request { display: block; }
    .bar { height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; margin-bottom: .4rem; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 3px; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100% { width: 30%; } 50% { width: 90%; } }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-weight: 600; color: #666; font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; padding: .6rem .8rem; border-bottom: 2px solid #eee; }
    td { padding: .7rem .8rem; border-bottom: 1px solid #f0f0f0; font-size: .9rem; }
    tr:hover td { background: #fafafa; }
    .badge { display: inline-block; padding: .25rem .65rem; border-radius: 12px; font-size: .75rem; font-weight: 600; }
    .badge-done { background: #d1fae5; color: #065f46; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .btn { display: inline-block; padding: .4rem .9rem; border-radius: 6px; font-size: .8rem; font-weight: 500; cursor: pointer; border: none; text-decoration: none; transition: background .15s; }
    .btn-primary { background: #6366f1; color: #fff; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-outline { background: #fff; color: #6366f1; border: 1px solid #6366f1; }
    .btn-outline:hover { background: #eef2ff; }
    .empty { text-align: center; padding: 2rem; color: #999; font-size: .9rem; }
    .toast { position: fixed; top: 1rem; right: 1rem; padding: .8rem 1.2rem; border-radius: 6px; font-size: .85rem; color: #fff; z-index: 1000; opacity: 0; transition: opacity .3s; }
    .toast.show { opacity: 1; }
    .toast-success { background: #059669; }
    .toast-error { background: #dc2626; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #ccc; border-top-color: #6366f1; border-radius: 50%; animation: spin .6s linear infinite; margin-right: 6px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>Translation Library</h1>

  <div class="card">
    <h2>Upload New Book</h2>
    <form
      hx-post="/api/upload"
      hx-encoding="multipart/form-data"
      hx-swap="outerHTML"
      hx-target="#book-list"
      hx-indicator="#upload-progress"
    >
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
    <div id="book-list" hx-get="/api/books" hx-trigger="load, every 30s" hx-swap="innerHTML">
      <table>
        <thead><tr><th>Name</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
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
      e.preventDefault();
      dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event("change"));
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) {
        const f = fileInput.files[0];
        if (!f.name.toLowerCase().endsWith(".txt")) { showToast("Only .txt files allowed", "error"); return; }
        if (f.size > 10 * 1024 * 1024) { showToast("File exceeds 10 MB limit", "error"); return; }
        fileInput.form.requestSubmit();
      }
    });

    document.body.addEventListener("htmx:afterOnLoad", (e) => {
      const el = e.detail.elt;
      const msg = el.getAttribute("data-toast");
      const type = el.getAttribute("data-toast-type");
      if (msg) showToast(msg, type);
    });

    function showToast(msg, type) {
      toast.textContent = msg;
      toast.className = "toast toast-" + (type === "error" ? "error" : "success");
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  </script>
</body>
</html>
`;

function renderTable(books: Book[]): string {
  if (books.length === 0) {
    return `<div class="empty">No books uploaded yet. Drop a .txt file above to get started.</div>`;
  }
  return `
<table>
  <thead><tr><th>Name</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead>
  <tbody>
    ${books
      .sort((a, b) => b.uploaded.localeCompare(a.uploaded))
      .map(
        (b) => `
      <tr>
        <td><strong>${escapeHtml(b.name)}</strong></td>
        <td>${statusBadge(b.status)}</td>
        <td style="color:#888;font-size:.8rem">${escapeHtml(b.uploaded)}</td>
        <td>
          <button
            class="btn btn-outline"
            hx-post="/api/translate/${encodeURIComponent(b.name)}"
            hx-swap="outerHTML"
            hx-target="closest tr"
          >Dịch lại</button>
        </td>
      </tr>`
      )
      .join("")}
  </tbody>
</table>`;
}

function statusBadge(status: string): string {
  if (status === "done") return `<span class="badge badge-done">Done</span>`;
  return `<span class="badge badge-pending">Pending</span>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(d: Date): string {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sanitizeName(name: string): string {
  return name
    .replace(/\.txt$/i, "")
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fff\u3400-\u4dbf\p{Script=Han}\-]/gu, "_")
    .slice(0, 120);
}

async function getBooks(env: Env): Promise<Book[]> {
  const books: Book[] = [];
  let cursor: string | undefined;

  do {
    const list = await env.LIBRARY.list({ prefix: "raw/", cursor });
    for (const obj of list.objects) {
      const name = obj.key.replace(/^raw\//, "").replace(/\.txt$/i, "");
      if (!name) continue;

      let metaObj: R2Object | null = null;
      try {
        metaObj = await env.LIBRARY.head(`translated/${name}/metadata.json`);
      } catch {}

      const status = metaObj ? "done" : "pending";
      const chapters = 0; // only read on demand

      books.push({
        name,
        uploaded: formatDate(obj.uploaded),
        status,
        chapters,
      });
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  return books;
}

async function triggerWorkflow(env: Env, bookName: string): Promise<{ ok: boolean; error?: string }> {
  const token = env.GITHUB_TOKEN;
  const owner = env.OWNER;
  const repo = env.REPO;

  if (!token || !owner || !repo) {
    return { ok: false, error: "Missing GitHub configuration (GITHUB_TOKEN, OWNER, REPO)" };
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "translation-lib-worker",
        },
        body: JSON.stringify({
          event_type: "new_book_uploaded",
          client_payload: { book_name: bookName },
        }),
      }
    );

    if (resp.status === 204) return { ok: true };
    const text = await resp.text();
    return { ok: false, error: `GitHub API returned ${resp.status}: ${text}` };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Front-end page
    if (request.method === "GET" && (path === "/" || path === "")) {
      return new Response(PAGE, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // List books (returns HTML table)
    if (request.method === "GET" && path === "/api/books") {
      const books = await getBooks(env);
      return new Response(renderTable(books), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Upload file
    if (request.method === "POST" && path === "/api/upload") {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return new Response(
          `<div class="empty" data-toast="No file selected" data-toast-type="error">No file selected.</div>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return new Response(
          `<div class="empty" data-toast="File exceeds 10 MB limit" data-toast-type="error">File too large.</div>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      const bookName = sanitizeName(file.name);
      if (!bookName) {
        return new Response(
          `<div class="empty" data-toast="Invalid file name" data-toast-type="error">Invalid file name.</div>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      const rawKey = `raw/${bookName}.txt`;
      await env.LIBRARY.put(rawKey, file.stream(), {
        httpMetadata: { contentType: "text/plain; charset=utf-8" },
      });

      const trigger = await triggerWorkflow(env, bookName);
      const books = await getBooks(env);

      const toastMsg = trigger.ok
        ? `Uploaded "${bookName}" — translation started.`
        : `Uploaded "${bookName}", but trigger failed: ${trigger.error}`;

      const toastType = trigger.ok ? "success" : "error";

      return new Response(
        `<div id="book-list" hx-get="/api/books" hx-trigger="every 30s" hx-swap="innerHTML" data-toast="${escapeHtml(toastMsg)}" data-toast-type="${toastType}">
  ${renderTable(books)}
</div>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Trigger retranslation for a specific book
    if (request.method === "POST" && path.startsWith("/api/translate/")) {
      const bookName = decodeURIComponent(path.replace("/api/translate/", ""));

      const rawObj = await env.LIBRARY.head(`raw/${bookName}.txt`);
      if (!rawObj) {
        return new Response(
          `<tr data-toast="Book not found: ${escapeHtml(bookName)}" data-toast-type="error">
  <td colspan="4">Book not found.</td></tr>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      const trigger = await triggerWorkflow(env, bookName);
      const books = await getBooks(env);
      const book = books.find((b) => b.name === bookName);

      if (!book) {
        return new Response(`<tr><td colspan="4">Book removed.</td></tr>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      const toastData = trigger.ok
        ? ""
        : ` data-toast="Trigger failed: ${escapeHtml(trigger.error || "")}" data-toast-type="error"`;

      return new Response(
        `<tr${toastData}>
  <td><strong>${escapeHtml(book.name)}</strong></td>
  <td>${statusBadge(book.status)}</td>
  <td style="color:#888;font-size:.8rem">${escapeHtml(book.uploaded)}</td>
  <td>
    <button class="btn btn-outline" hx-post="/api/translate/${encodeURIComponent(book.name)}" hx-swap="outerHTML" hx-target="closest tr">
      Dịch lại
    </button>
  </td>
</tr>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
