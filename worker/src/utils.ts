export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDate(d: Date): string {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

export function sanitizeName(name: string): string {
  return name
    .replace(/\.txt$/i, "")
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fff\u3400-\u4dbf\p{Script=Han}\-]/gu, "_")
    .slice(0, 120);
}

export function statusBadge(status: string): string {
  if (status === "done")
    return `<span class="badge" style="background:#d1fae5;color:#065f46;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Done</span>`;
  if (status === "translating")
    return `<span class="badge" style="background:#dbeafe;color:#1e40af;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Đang dịch...</span>`;
  if (status === "processing")
    return `<span class="badge" style="background:#ede9fe;color:#6d28d9;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Đang chia...</span>`;
  if (status === "processed")
    return `<span class="badge" style="background:#ccfbf1;color:#0f766e;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Đã chia</span>`;
  return `<span class="badge" style="background:#fef3c7;color:#92400e;padding:.2rem .6rem;border-radius:10px;font-size:.75rem;font-weight:600">Raw</span>`;
}

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvcnM9Nz1umt0aa7A2DQ9OQrQrEQ2jijU",
  authDomain: "x-translate-5e6ee.firebaseapp.com",
  projectId: "x-translate-5e6ee",
  storageBucket: "x-translate-5e6ee.firebasestorage.app",
  messagingSenderId: "1041577126788",
  appId: "1:1041577126788:web:28f3d227491e86c3ff8bd1",
};

export function getUid(request: Request): string {
  const header = request.headers.get("X-Reader-UID") || "";
  if (header && /^[a-zA-Z0-9]{20,}$/.test(header)) return header;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/reader_uid=([a-zA-Z0-9]+)/);
  return match ? match[1] : "";
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

export const FIREBASE_HEAD = `
<script src="https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js"></script>
<script>
  firebase.initializeApp(${JSON.stringify(FIREBASE_CONFIG)});
  var auth = firebase.auth();
  var provider = new firebase.auth.GoogleAuthProvider();

  function updateAuthUI(user) {
    var btn = document.getElementById('auth-btn');
    if (!btn) return;
    if (user) {
      btn.innerHTML = '\\u{1F464} ' + (user.displayName || user.email || 'Reader').split(' ')[0] + ' <span style="font-size:.7rem;color:#999">| Đăng xuất</span>';
      btn.onclick = function() { auth.signOut(); };
      btn.className = 'btn btn-ghost';
      document.cookie = 'reader_uid=' + user.uid + '; Path=/; SameSite=Lax; Max-Age=' + (365*24*3600) + '; Secure';
    } else {
      btn.innerHTML = '\\u{1F511} Đăng nhập';
      btn.onclick = function() {
        auth.signInWithPopup(provider).then(function() {
          location.reload();
        }).catch(function(e) { console.error(e); });
      };
      btn.className = 'btn btn-outline';
    }
  }

  auth.onAuthStateChanged(function(user) {
    updateAuthUI(user);
  });
</script>`;
