// Web-search discovery via Vertex Gemini + Google Search grounding (design
// §6.1.1). Google closed the Custom Search JSON API to new projects (2026-01-20),
// so instead of a plain search endpoint we ask Gemini to search the web with the
// googleSearch tool and harvest the sources it grounds on — same GCP project,
// billing, and ADC as the Vertex embeddings, no extra vendor.
//
// Two wrinkles this module handles so the rest of the pipeline doesn't see them:
//  - Grounding returns opaque, ~30-day-expiring redirect URLs, not publisher
//    URLs. We resolve each to its canonical target before returning, since the
//    record id, dedup, and archive all key off the real URL.
//  - A chunk's `web.title` is usually just the domain, and there's no snippet
//    field. We synthesize a snippet from the answer segments that cite each
//    source (`groundingSupports`), which gives the cheap topic gate real text.
import type { SearchHit, SearchProvider } from "./provider.ts";

export interface GroundingConfig {
  /** GCP project id. Defaults to $VERTEX_PROJECT, then $GOOGLE_CLOUD_PROJECT. */
  project?: string;
  /** Region, e.g. "us-central1". Defaults to $VERTEX_LOCATION, then us-central1. */
  location?: string;
  /** Grounding model. Defaults to $GROUNDING_MODEL, then gemini-2.5-flash. */
  model?: string;
  /** Max redirect resolutions to run at once. */
  concurrency?: number;
}

// Lazily load google-auth-library only when we actually search, so importing
// this module (e.g. to call the pure parseGrounding in tests) doesn't pull in
// the auth SDK's env-reading top-level code.
let tokenFn: (() => Promise<string | null>) | null = null;
async function accessToken(): Promise<string | null> {
  if (!tokenFn) {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    tokenFn = async () => {
      const client = await auth.getClient();
      const { token } = await client.getAccessToken();
      return token ?? null;
    };
  }
  return tokenFn();
}

interface GroundingResponse {
  candidates?: {
    groundingMetadata?: {
      groundingChunks?: { web?: { uri?: string; title?: string; domain?: string } }[];
      groundingSupports?: { segment?: { text?: string }; groundingChunkIndices?: number[] }[];
    };
  }[];
}

/**
 * Parse a Vertex generateContent grounding response into hits, keeping each
 * source's raw (still-redirect) URL and a snippet built from the answer segments
 * that cited it. Pure and network-free, so it's unit-testable; the provider
 * resolves the redirect URLs on top.
 */
export function parseGrounding(json: unknown): SearchHit[] {
  const gm = (json as GroundingResponse)?.candidates?.[0]?.groundingMetadata;
  const chunks = gm?.groundingChunks ?? [];
  const supports = gm?.groundingSupports ?? [];

  const snippets = new Map<number, string[]>();
  for (const s of supports) {
    const text = s?.segment?.text;
    if (!text) continue;
    for (const ci of s?.groundingChunkIndices ?? []) {
      const arr = snippets.get(ci) ?? [];
      arr.push(text);
      snippets.set(ci, arr);
    }
  }

  const hits: SearchHit[] = [];
  chunks.forEach((c, i) => {
    const web = c?.web;
    if (!web?.uri) return; // no source URL to harvest
    hits.push({
      url: web.uri,
      title: web.title ?? web.domain,
      snippet: snippets.get(i)?.join(" "),
    });
  });
  return hits;
}

/**
 * Follow a grounding redirect to its canonical publisher URL. Best-effort: on
 * timeout/error it returns the last URL it had (which still works until Google
 * expires it, and the page-fetch step follows redirects anyway).
 */
async function resolveRedirect(url: string, hops = 3): Promise<string> {
  let current = url;
  for (let i = 0; i < hops; i++) {
    let res: Response;
    try {
      res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    } catch {
      return current;
    }
    const loc = res.headers.get("location");
    try {
      await res.body?.cancel();
    } catch { /* no body to release */ }
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).href;
      continue;
    }
    return current;
  }
  return current;
}

export function groundingSearchProvider(cfg: GroundingConfig = {}): SearchProvider {
  const project = cfg.project ?? Deno.env.get("VERTEX_PROJECT") ??
    Deno.env.get("GOOGLE_CLOUD_PROJECT");
  const location = cfg.location ?? Deno.env.get("VERTEX_LOCATION") ?? "us-central1";
  const model = cfg.model ?? Deno.env.get("GROUNDING_MODEL") ?? "gemini-2.5-flash";
  const concurrency = cfg.concurrency ?? 6;

  const endpoint =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

  return {
    id: "gemini-grounding",
    async search(query: string, since?: string): Promise<SearchHit[]> {
      if (!project) {
        throw new Error("Vertex project not set (VERTEX_PROJECT / GOOGLE_CLOUD_PROJECT)");
      }
      const token = await accessToken();
      if (!token) {
        throw new Error(
          "no Application Default Credentials — run `gcloud auth application-default login`",
        );
      }

      const recency = since ? ` Prefer pages published on or after ${since.slice(0, 10)}.` : "";
      const prompt =
        `Find recent web pages — research papers, news articles, and blog posts — about: ${query}.` +
        recency + ` List the most relevant and authoritative sources.`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
        }),
      });
      if (!res.ok) throw new Error(`gemini grounding -> ${res.status}: ${await res.text()}`);

      const hits = parseGrounding(await res.json());

      // Resolve redirect URLs to canonical publisher URLs (bounded concurrency).
      const out: SearchHit[] = [];
      for (let i = 0; i < hits.length; i += concurrency) {
        const batch = hits.slice(i, i + concurrency);
        const urls = await Promise.all(batch.map((h) => resolveRedirect(h.url)));
        batch.forEach((h, j) => out.push({ ...h, url: urls[j] }));
      }
      return out;
    },
  };
}
