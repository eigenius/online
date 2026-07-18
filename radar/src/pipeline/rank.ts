import type { ArchiveRecord } from "../types.ts";

export interface RankedRecord {
  record: ArchiveRecord;
  score: number;
}

/**
 * Fuse a record's signals into a single score (design §4, stage 7):
 *   0.50 · peak topic relevance + 0.35 · significance + 0.15 · sighting count.
 * Sightings are capped at 5 so a widely-reposted item can't dominate on volume
 * alone. All three inputs are in [0, 1], so the score is too.
 */
export function score(rec: ArchiveRecord): number {
  const s = rec.signals;
  const relevance = s.relevance ? Math.max(0, ...Object.values(s.relevance)) : 0;
  const significance = s.significance ?? 0;
  const sightings = Math.min(rec.sightings.length, 5) / 5;
  return 0.5 * relevance + 0.35 * significance + 0.15 * sightings;
}

/** Score and order records, highest first (design §4, stage 7). */
export function rank(records: ArchiveRecord[]): RankedRecord[] {
  return records
    .map((record) => ({ record, score: score(record) }))
    .sort((a, b) => b.score - a.score);
}
