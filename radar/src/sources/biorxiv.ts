// bioRxiv / medRxiv adapter (design §3) via the public details API. The API has
// no query interface — it returns every preprint in a date range — so we pull
// the last few days and let the cheap topic gate keep only the AI-in-life-
// sciences ones. DOIs flow through to Semantic Scholar for citation velocity.
import type { Candidate } from "../types.ts";
import type { SourceAdapter, Watermark } from "./adapter.ts";
import { httpGet } from "../fetch/http.ts";

const DETAILS_API = "https://api.biorxiv.org/details";
const PAGE = 100; // the API returns up to 100 rows per cursor page

export interface BiorxivConfig {
  id: string;
  /** "biorxiv" (default) or "medrxiv". */
  server?: "biorxiv" | "medrxiv";
  /** Size of the date window ending today, in days. Default 2. */
  days?: number;
  /** Safety cap on rows pulled across pages. Default 300. */
  maxResults?: number;
}

interface BiorxivPaper {
  doi: string;
  title: string;
  authors: string;
  date: string;
  category?: string;
  abstract?: string;
  version?: string;
}

/** Map a details-API row to a candidate. Pure. The URL is the DOI resolver —
 *  robust to bioRxiv's DOI-prefix changes and it lands on the preprint page. */
export function paperToCandidate(p: BiorxivPaper, source: string): Candidate {
  const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  return {
    source,
    sourceKind: "preprint",
    url: `https://doi.org/${p.doi}`,
    title: clean(p.title),
    authors: (p.authors ?? "").split(";").map((a) => a.trim()).filter(Boolean),
    publishedAt: p.date,
    abstract: clean(p.abstract) || undefined,
    canonicalHint: p.doi ? { type: "doi", value: p.doi } : undefined,
  };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function biorxivAdapter(cfg: BiorxivConfig): SourceAdapter {
  const server = cfg.server ?? "biorxiv";
  const days = cfg.days ?? 2;
  const maxResults = cfg.maxResults ?? 300;
  return {
    id: cfg.id,
    async *since(_watermark: Watermark): AsyncIterable<Candidate> {
      const to = new Date();
      const from = new Date(to.getTime() - days * 86_400_000);
      const range = `${isoDay(from)}/${isoDay(to)}`;

      let cursor = 0;
      let yielded = 0;
      while (yielded < maxResults) {
        let collection: BiorxivPaper[];
        try {
          const json = JSON.parse(
            await httpGet(`${DETAILS_API}/${server}/${range}/${cursor}/json`),
          );
          collection = (json.collection ?? []) as BiorxivPaper[];
        } catch (err) {
          console.error(`${cfg.id}: fetch failed: ${err instanceof Error ? err.message : err}`);
          break;
        }
        if (collection.length === 0) break;
        for (const p of collection) {
          if (yielded >= maxResults) break;
          yield paperToCandidate(p, cfg.id);
          yielded++;
        }
        if (collection.length < PAGE) break; // last page
        cursor += collection.length;
      }
    },
  };
}
