// Shared candidate collection for the weekly jobs (digest, assemble): the new
// records in the window, with near-duplicates from multiple sources collapsed
// via embeddings so we neither judge/summarize nor publish the same story twice.
// Records come from the JSONL log (full signals + sightings intact); the vector
// sidecar supplies the embeddings for the fuzzy match.
import { RecordStore } from "../store/records.ts";
import { VectorStore } from "../store/vectors.ts";
import { dedupByEmbedding } from "../pipeline/dedup.ts";
import type { ArchiveRecord, SourceKind } from "../types.ts";

/** Which source wins when a duplicate cluster is collapsed — primary first. */
const KEEP_RANK: Record<SourceKind, number> = {
  paper: 0,
  preprint: 0,
  industry: 1,
  opinion: 2,
  news: 3,
};

/** Default: an item published more than this many days ago isn't "new" for the
 *  issue, even if we only just discovered it. Generous enough for slightly-lagged
 *  discovery; a stale RSS post or a resurfaced old paper is dropped. */
export const DEFAULT_MAX_AGE_DAYS = 90;

export interface Candidates {
  /** New records with near-duplicates collapsed (keep-preference order). */
  records: ArchiveRecord[];
  /** New records in the window before recency filter + dedup. */
  total: number;
  /** How many were dropped as too old (publishedAt past the max age). */
  stale: number;
  /** How many were merged away as duplicates. */
  collapsed: number;
}

export interface CandidatesOptions {
  /** Max publish age in days; older items are dropped. Default 90. */
  maxAgeDays?: number;
}

export async function newCandidates(
  archiveDir: string,
  sinceIso: string,
  opts: CandidatesOptions = {},
): Promise<Candidates> {
  const all = await new RecordStore(archiveDir).newSince(sinceIso);

  // Recency: "new this week" means recently *published*, not just recently
  // discovered. Drop records whose known publish date is past the max age;
  // records with no publishedAt pass (we can't tell).
  const maxAge = opts.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  const staleBefore = new Date(Date.now() - maxAge * 86_400_000).toISOString().slice(0, 10);
  const fresh = all.filter((r) => !r.publishedAt || r.publishedAt >= staleBefore);

  // Keep-preference order for dedup: primary sources first, then newest.
  fresh.sort((a, b) => {
    const d = KEEP_RANK[a.sourceKind] - KEEP_RANK[b.sourceKind];
    return d !== 0 ? d : (a.firstSeen < b.firstSeen ? 1 : -1);
  });

  const vecMap = await new VectorStore(archiveDir).map();
  const records = dedupByEmbedding(fresh, (id) => vecMap.get(id));
  return {
    records,
    total: all.length,
    stale: all.length - fresh.length,
    collapsed: fresh.length - records.length,
  };
}
