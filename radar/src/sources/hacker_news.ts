// Hacker News adapter (design §3) via the Algolia search API. Searches stories
// matching the configured queries, keeps those with enough points (community
// traction — a discovery signal, not the article itself), and yields the linked
// article as a candidate; the harvest page-fetch then pulls the real text. The
// cheap topic gate filters out anything off-topic that the query dragged in.
import type { Candidate } from "../types.ts";
import type { SourceAdapter, Watermark } from "./adapter.ts";
import { httpGet } from "../fetch/http.ts";

const HN_API = "https://hn.algolia.com/api/v1/search_by_date";

export interface HackerNewsConfig {
  id: string;
  /** Search terms — usually a few high-signal topic phrases. */
  queries: string[];
  /** Minimum points for a story to count (community traction). Default 20. */
  minPoints?: number;
  /** Hits pulled per query. Default 20. */
  hitsPerQuery?: number;
  /** Only stories posted within this many days — keeps stale-but-popular hits
   *  out of "what's new". Default 30. */
  days?: number;
}

interface HnHit {
  objectID: string;
  title?: string;
  url?: string | null;
  author?: string;
  points?: number;
  created_at?: string;
  story_text?: string | null;
}

/** Minimal HTML strip for the occasional Ask/Show HN self-post body. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map an Algolia hit to a candidate (pure — the URL falls back to the HN
 *  discussion permalink for self-posts with no external link). */
export function hitToCandidate(hit: HnHit, source: string): Candidate | null {
  if (!hit.title) return null;
  const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;
  return {
    source,
    sourceKind: "news",
    url: hit.url || discussion,
    title: hit.title,
    authors: hit.author ? [hit.author] : [],
    publishedAt: hit.created_at?.slice(0, 10),
    abstract: hit.story_text ? stripHtml(hit.story_text) : undefined,
  };
}

export function hackerNewsAdapter(cfg: HackerNewsConfig): SourceAdapter {
  const minPoints = cfg.minPoints ?? 20;
  const hitsPerPage = cfg.hitsPerQuery ?? 20;
  const days = cfg.days ?? 30;
  return {
    id: cfg.id,
    async *since(_watermark: Watermark): AsyncIterable<Candidate> {
      const cutoff = Math.floor((Date.now() - days * 86_400_000) / 1000); // unix seconds
      const seen = new Set<string>();
      for (const query of cfg.queries) {
        const params = new URLSearchParams({
          query,
          tags: "story",
          hitsPerPage: String(hitsPerPage),
          numericFilters: `points>=${minPoints},created_at_i>=${cutoff}`,
        });
        let hits: HnHit[];
        try {
          const json = JSON.parse(await httpGet(`${HN_API}?${params}`));
          hits = (json.hits ?? []) as HnHit[];
        } catch (err) {
          console.error(
            `hacker_news: query "${query}" failed: ${err instanceof Error ? err.message : err}`,
          );
          continue;
        }
        for (const hit of hits) {
          const cand = hitToCandidate(hit, cfg.id);
          if (!cand || seen.has(cand.url)) continue;
          seen.add(cand.url);
          yield cand;
        }
      }
    },
  };
}
