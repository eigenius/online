// Semantic Scholar enrichment (design §3, §4 stage 7). Looks up citation counts
// for arXiv/DOI records and derives a rough citation-velocity signal used in
// ranking — arXiv gives us papers, S2 tells us how cited they are. Uses the
// batch endpoint (one request per 500 ids). SEMANTIC_SCHOLAR_API_KEY raises the
// rate limit but isn't required.
import type { ArchiveRecord } from "../types.ts";

const BATCH_URL = "https://api.semanticscholar.org/graph/v1/paper/batch";
const CHUNK = 500;

/** The S2 id for a record, or null if it has no id S2 can resolve. */
function s2Id(rec: ArchiveRecord): string | null {
  if (rec.canonical.type === "arxiv") return `ARXIV:${rec.canonical.value}`;
  if (rec.canonical.type === "doi") return `DOI:${rec.canonical.value}`;
  return null;
}

/** Citations per year since publication (falls back to raw count if undated). */
function velocity(citationCount: number, publicationDate?: string | null): number {
  if (!publicationDate) return citationCount;
  const years = (Date.now() - Date.parse(publicationDate)) / (365.25 * 86_400_000);
  if (!Number.isFinite(years)) return citationCount;
  return citationCount / Math.max(0.25, years);
}

interface S2Paper {
  citationCount?: number;
  publicationDate?: string;
}

/**
 * Set `signals.citationVelocity` on the records S2 recognizes. Returns how many
 * were enriched. Records without an arXiv/DOI id are skipped.
 */
export async function enrichCitations(records: ArchiveRecord[]): Promise<number> {
  const targets: { rec: ArchiveRecord; id: string }[] = [];
  for (const rec of records) {
    const id = s2Id(rec);
    if (id) targets.push({ rec, id });
  }
  if (targets.length === 0) return 0;

  const headers: Record<string, string> = { "content-type": "application/json" };
  const key = Deno.env.get("SEMANTIC_SCHOLAR_API_KEY");
  if (key) headers["x-api-key"] = key;

  let enriched = 0;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const res = await fetch(`${BATCH_URL}?fields=citationCount,publicationDate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ids: chunk.map((t) => t.id) }),
    });
    if (!res.ok) throw new Error(`semantic scholar batch -> ${res.status}: ${await res.text()}`);
    const data = await res.json() as (S2Paper | null)[];
    data.forEach((entry, j) => {
      if (!entry || typeof entry.citationCount !== "number") return;
      const rec = chunk[j].rec;
      rec.signals = {
        ...rec.signals,
        citationVelocity: Math.round(velocity(entry.citationCount, entry.publicationDate) * 10) /
          10,
      };
      enriched++;
    });
  }
  return enriched;
}
