// arXiv adapter (design §3, §6.1) — the working Phase 0 vertical slice.
// Queries the arXiv Atom API for the configured categories and yields candidates.
import { parse } from "@libs/xml";
import type { Candidate } from "../types.ts";
import type { SourceAdapter, Watermark } from "./adapter.ts";
import { httpGet } from "../fetch/http.ts";

const ARXIV_API = "https://export.arxiv.org/api/query";

export interface ArxivConfig {
  categories: string[];
  maxResults?: number;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

function field(obj: unknown, key: string): unknown {
  return obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
}

/** Read the text of a parsed XML node (handles both bare strings and `{ "#text": … }`). */
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  const t = field(v, "#text");
  return t == null ? "" : String(t);
}

export function arxivAdapter(cfg: ArxivConfig): SourceAdapter {
  return {
    id: "arxiv",
    async *since(_watermark: Watermark): AsyncIterable<Candidate> {
      const searchQuery = cfg.categories.map((c) => `cat:${c}`).join(" OR ");
      const params = new URLSearchParams({
        search_query: searchQuery,
        sortBy: "submittedDate",
        sortOrder: "descending",
        max_results: String(cfg.maxResults ?? 50),
      });
      const xml = await httpGet(`${ARXIV_API}?${params.toString()}`);
      const doc = parse(xml);
      const feed = field(doc, "feed");

      for (const entry of asArray(field(feed, "entry"))) {
        const idUrl = text(field(entry, "id"));
        const arxivId = idUrl
          .replace(/^https?:\/\/arxiv\.org\/abs\//, "")
          .replace(/v\d+$/, "");
        const authors = asArray(field(entry, "author"))
          .map((a) => text(field(a, "name")))
          .filter((n) => n.length > 0);

        yield {
          source: "arxiv",
          sourceKind: "preprint",
          url: idUrl,
          title: text(field(entry, "title")).replace(/\s+/g, " ").trim(),
          authors,
          publishedAt: text(field(entry, "published")).slice(0, 10),
          abstract: text(field(entry, "summary")).replace(/\s+/g, " ").trim(),
          canonicalHint: { type: "arxiv", value: arxivId },
        };
      }
    },
  };
}
