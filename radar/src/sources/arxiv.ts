// arXiv adapter (design §3, §6.1) — the working Phase 0 vertical slice.
// Queries the arXiv Atom API for the configured categories and yields candidates.
import { parse } from "@libs/xml";
import type { ArchiveRecord, Candidate } from "../types.ts";
import type { SourceAdapter, Watermark } from "./adapter.ts";
import { httpGet } from "../fetch/http.ts";
import { arxivId } from "../pipeline/normalize.ts";

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

/**
 * Fill authors / date / abstract for arXiv records that lack them — e.g. papers
 * found via the web-search sweep, which only yields a title + snippet. Looks the
 * ids up in one batched arXiv API call and mutates the records in place. Returns
 * how many were enriched.
 */
export async function enrichArxiv(records: ArchiveRecord[]): Promise<number> {
  const targets = new Map<string, ArchiveRecord>();
  for (const rec of records) {
    if (rec.authors.length > 0 && rec.publishedAt) continue; // already complete
    const id = rec.canonical.type === "arxiv" ? rec.canonical.value : arxivId(rec.url);
    if (id) targets.set(id, rec);
  }
  if (targets.size === 0) return 0;

  const ids = [...targets.keys()];
  let enriched = 0;
  const CHUNK = 50;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = ids.slice(i, i + CHUNK);
    const params = new URLSearchParams({
      id_list: batch.join(","),
      max_results: String(batch.length),
    });
    let xml: string;
    try {
      xml = await httpGet(`${ARXIV_API}?${params.toString()}`);
    } catch (err) {
      console.error(`arxiv enrich: ${err instanceof Error ? err.message : err}`);
      break;
    }
    const feed = field(parse(xml), "feed");
    for (const entry of asArray(field(feed, "entry"))) {
      const id = text(field(entry, "id"))
        .replace(/^https?:\/\/arxiv\.org\/abs\//, "")
        .replace(/v\d+$/, "");
      const rec = targets.get(id);
      if (!rec) continue;
      const authors = asArray(field(entry, "author"))
        .map((a) => text(field(a, "name")))
        .filter((n) => n.length > 0);
      if (authors.length > 0 && rec.authors.length === 0) rec.authors = authors;
      const published = text(field(entry, "published")).slice(0, 10);
      if (published && !rec.publishedAt) rec.publishedAt = published;
      const summary = text(field(entry, "summary")).replace(/\s+/g, " ").trim();
      if (summary && (rec.abstract?.length ?? 0) < summary.length) rec.abstract = summary;
      enriched++;
    }
  }
  return enriched;
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
