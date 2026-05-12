import type { Env } from "./types";
import { escapeHtml, sanitizeName, statusBadge } from "./utils";
import { getNovels, getMeta, getChapterText, getAdminBooks } from "./data";
import { triggerWorkflow } from "./github";
import { renderLibrary, renderNovel, renderChapter, renderAdminTable, ADMIN_PAGE } from "./views";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Reader routes ────────────────────────────

    if (request.method === "GET" && path === "/") {
      const novels = await getNovels(env);
      return new Response(renderLibrary(novels), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Novel detail — chapter list + intro content
    const novelMatch = path.match(/^\/read\/([^/]+)$/);
    if (request.method === "GET" && novelMatch) {
      const name = decodeURIComponent(novelMatch[1]);
      const meta = await getMeta(env, name);
      if (!meta) {
        return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem"><div class="empty">Không tìm thấy truyện "${escapeHtml(name)}".</div><p><a href="/">← Thư viện</a></p></body></html>`, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      let introContent: string | null = null;
      if (meta.chapters.some(c => c.id === 0)) {
        introContent = await getChapterText(env, name, 0);
      }

      return new Response(renderNovel(name, meta, introContent), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Chapter reader
    const chapterMatch = path.match(/^\/read\/([^/]+)\/(\d+)$/);
    if (request.method === "GET" && chapterMatch) {
      const name = decodeURIComponent(chapterMatch[1]);
      const id = parseInt(chapterMatch[2], 10);

      const meta = await getMeta(env, name);
      if (!meta) {
        return new Response(`<div class="empty">Không tìm thấy truyện.</div>`, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const ch = meta.chapters.find(c => c.id === id);
      if (!ch) {
        return new Response(`<div class="empty">Không tìm thấy chương ${id}.</div>`, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const content = await getChapterText(env, name, id);
      if (content === null) {
        return new Response(`<div class="empty">Chương ${id} chưa được dịch.</div>`, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      return new Response(renderChapter(name, ch, meta, content), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // ── Admin page ───────────────────────────────

    if (request.method === "GET" && path === "/admin") {
      return new Response(ADMIN_PAGE, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // ── Admin API routes ─────────────────────────

    if (request.method === "GET" && path === "/api/books") {
      const books = await getAdminBooks(env);
      return new Response(renderAdminTable(books), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

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
      const books = await getAdminBooks(env);

      const toastMsg = trigger.ok
        ? `Uploaded "${bookName}" — translation started.`
        : `Uploaded "${bookName}", but trigger failed: ${trigger.error}`;
      const toastType = trigger.ok ? "success" : "error";

      return new Response(
        `<div id="book-list" hx-get="/api/books" hx-trigger="every 30s" hx-swap="innerHTML" data-toast="${escapeHtml(toastMsg)}" data-toast-type="${toastType}">
  ${renderAdminTable(books)}
</div>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    if (request.method === "POST" && path.startsWith("/api/translate/")) {
      const bookName = decodeURIComponent(path.replace("/api/translate/", ""));

      const rawObj = await env.LIBRARY.head(`raw/${bookName}.txt`);
      if (!rawObj) {
        return new Response(
          `<tr data-toast="Book not found: ${escapeHtml(bookName)}" data-toast-type="error"><td colspan="4">Book not found.</td></tr>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      const trigger = await triggerWorkflow(env, bookName);
      const books = await getAdminBooks(env);
      const book = books.find(b => b.name === bookName);

      if (!book) {
        return new Response(`<tr><td colspan="4">Book removed.</td></tr>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      const toastData = trigger.ok ? "" : ` data-toast="Trigger failed: ${escapeHtml(trigger.error || "")}" data-toast-type="error"`;
      const badge = trigger.ok ? statusBadge("translating") : statusBadge(book.status);
      const btnHtml = trigger.ok
        ? `<button class="btn btn-outline" disabled style="opacity:.5">Đã kích hoạt</button>`
        : `<button class="btn btn-outline" hx-post="/api/translate/${encodeURIComponent(book.name)}" hx-swap="outerHTML" hx-target="closest tr">Dịch lại</button>`;

      return new Response(
        `<tr${toastData}>
  <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0;font-size:.9rem"><strong>${escapeHtml(book.name)}</strong></td>
  <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0">${badge}</td>
  <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0;color:#888;font-size:.8rem">${escapeHtml(book.uploaded)}</td>
  <td style="padding:.7rem .8rem;border-bottom:1px solid #f0f0f0">
    ${btnHtml}
  </td>
</tr>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
