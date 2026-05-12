import type { Env } from "./types";

export async function triggerWorkflow(env: Env, bookName: string): Promise<{ ok: boolean; error?: string }> {
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
