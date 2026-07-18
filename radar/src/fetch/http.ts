// Shared HTTP client for the deterministic harvest (design §6.1): a global
// politeness throttle plus retry-with-backoff on transient failures. A
// per-host limiter is the obvious next step; this keeps Phase 0 simple.

// A browser-like User-Agent: many publisher CDNs (Cloudflare et al.) 403 plain
// bot UAs, and we only read public article pages a human reader freely can.
// Override with HARVEST_USER_AGENT (e.g. a transparent bot identifier) to taste.
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
function resolveUserAgent(): string {
  try {
    return Deno.env.get("HARVEST_USER_AGENT") ?? DEFAULT_USER_AGENT;
  } catch {
    return DEFAULT_USER_AGENT; // no --allow-env (e.g. under the test runner)
  }
}
const USER_AGENT = resolveUserAgent();
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
      headers: {
        "user-agent": USER_AGENT,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        ...(init?.headers ?? {}),
      },
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
