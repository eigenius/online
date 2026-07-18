// Shared HTTP client for the deterministic harvest (design §6.1): a global
// politeness throttle plus retry-with-backoff on transient failures. A
// per-host limiter is the obvious next step; this keeps Phase 0 simple.

const USER_AGENT = "eigenius-radar/0.0.1 (+https://eigenius.online)";
const MIN_INTERVAL_MS = 3_000; // arXiv etiquette: no more than ~1 request / 3s
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

let lastRequest = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function httpFetch(
  url: string,
  init?: RequestInit,
  retries = 3,
): Promise<Response> {
  for (let attempt = 0;; attempt++) {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRequest);
    if (wait > 0) await delay(wait);
    lastRequest = Date.now();

    const res = await fetch(url, {
      ...init,
      headers: { "user-agent": USER_AGENT, ...(init?.headers ?? {}) },
    });
    if (res.ok) return res;

    if (attempt >= retries || !RETRYABLE.has(res.status)) {
      await res.body?.cancel();
      throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
    }
    const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt;
    await res.body?.cancel();
    await delay(retryAfter * 1_000);
  }
}

export async function httpGet(url: string, init?: RequestInit): Promise<string> {
  const res = await httpFetch(url, init);
  return await res.text();
}
