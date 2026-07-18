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

export interface Candidates {
  /** New records with near-duplicates collapsed (keep-preference order). */
  records: ArchiveRecord[];
  /** New records in the window before dedup. */
  total: number;
  /** How many were merged away as duplicates. */
  collapsed: number;
}

export async function newCandidates(archiveDir: string, sinceIso: string): Promise<Candidates> {
  const fresh = await new RecordStore(archiveDir).newSince(sinceIso);

  // Keep-preference order for dedup: primary sources first, then newest.
  fresh.sort((a, b) => {
    const d = KEEP_RANK[a.sourceKind] - KEEP_RANK[b.sourceKind];
    return d !== 0 ? d : (a.firstSeen < b.firstSeen ? 1 : -1);
  });

  const vecMap = await new VectorStore(archiveDir).map();
  const records = dedupByEmbedding(fresh, (id) => vecMap.get(id));
  return { records, total: fresh.length, collapsed: fresh.length - records.length };
}
