export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatDate(d: Date): string {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sanitizeName(name: string): string {
  return name
    .replace(/\.txt$/i, "")
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fff\u3400-\u4dbf\p{Script=Han}\-]/gu, "_")
    .slice(0, 120);
}

export function statusBadge(status: string): string {
  if (status === "done") return `<span class="badge" style="background:#d1fae5;color:#065f46;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Done</span>`;
  if (status === "translating") return `<span class="badge" style="background:#dbeafe;color:#1e40af;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Đang dịch...</span>`;
  if (status === "processing") return `<span class="badge" style="background:#ede9fe;color:#6d28d9;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Đang chia...</span>`;
  if (status === "processed") return `<span class="badge" style="background:#ccfbf1;color:#0f766e;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Đã chia</span>`;
  return `<span class="badge" style="background:#fef3c7;color:#92400e;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Raw</span>`;
}

export const SHARED_CSS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Roboto, sans-serif; background: #f5f5f5; color: #333; }
  a { color: #6366f1; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .btn { display: inline-block; padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 500; cursor: pointer; border: none; text-decoration: none; transition: background .15s; }
  .btn-primary { background: #6366f1; color: #fff; }
  .btn-primary:hover { background: #4f46e5; }
  .btn-outline { background: #fff; color: #6366f1; border: 1px solid #6366f1; }
  .btn-outline:hover { background: #eef2ff; }
  .btn-ghost { background: transparent; color: #6366f1; border: none; }
  .btn-ghost:hover { background: #eef2ff; }
  .empty { text-align: center; padding: 3rem 1rem; color: #999; font-size: .95rem; }
  .toast { position: fixed; top: 1rem; right: 1rem; padding: .8rem 1.2rem; border-radius: 6px; font-size: .85rem; color: #fff; z-index: 1000; opacity: 0; transition: opacity .3s; }
  .toast.show { opacity: 1; }
  .toast-success { background: #059669; }
  .toast-error { background: #dc2626; }
</style>`;
