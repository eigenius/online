import type { ArchiveRecord } from "../types.ts";

export interface RankedRecord {
  record: ArchiveRecord;
  score: number;
}

/**
 * Fuse a record's signals into a single score (design §4, stage 7):
 *   0.45 · peak topic relevance + 0.30 · significance
 *   + 0.15 · citation velocity + 0.10 · sighting count.
 * Sightings cap at 5 and citation velocity at ~20 cites/yr, so neither can
 * dominate on volume alone. All four inputs are in [0, 1], so the score is too.
 */
export function score(rec: ArchiveRecord): number {
  const s = rec.signals;
  const relevance = s.relevance ? Math.max(0, ...Object.values(s.relevance)) : 0;
  const significance = s.significance ?? 0;
  const sightings = Math.min(rec.sightings.length, 5) / 5;
  const citations = Math.min(s.citationVelocity ?? 0, 20) / 20;
  return 0.45 * relevance + 0.3 * significance + 0.15 * citations + 0.1 * sightings;
}

/** Score and order records, highest first (design §4, stage 7). */
export function rank(records: ArchiveRecord[]): RankedRecord[] {
  return records
    .map((record) => ({ record, score: score(record) }))
    .sort((a, b) => b.score - a.score);
}
