import type { ArchiveRecord, Vector } from "../types.ts";

/**
 * Find an existing record the candidate is a duplicate of (design §4, stage 3).
 * Canonical-id collisions are already handled upstream by the content-addressed
 * id (normalize.ts). This is where the fuzzier checks go — title + author
 * near-match, then embedding cosine similarity (§6.4 dedup lookup). Stub:
 * returns null (treat as new).
 */
export function findDuplicate(
  _rec: ArchiveRecord,
  _existing: Iterable<ArchiveRecord>,
): ArchiveRecord | null {
  return null;
}

/** Cosine similarity at/above which two records are treated as the same story.
 *  Title + first-page embeddings of one event across outlets cluster tightly;
 *  distinct stories on a shared topic sit well below this. Tunable. */
export const DUPLICATE_COSINE = 0.93;

function cosine(a: Vector, b: Vector): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** Merge `from`'s sightings into `into`, deduped by url. */
function mergeSightings(into: ArchiveRecord, from: ArchiveRecord): void {
  const seen = new Set(into.sightings.map((s) => s.url));
  for (const s of from.sightings) {
    if (!seen.has(s.url)) {
      into.sightings.push(s);
      seen.add(s.url);
    }
  }
}

/**
 * Collapse near-duplicate records — the same story from several sources — by
 * embedding cosine similarity (design §4 stage 3, the fuzzy half of dedup; §6.4).
 * Records are considered in the order given, so put the one you'd rather keep
 * first (e.g. the primary source, or the newest). When a later record is within
 * `threshold` of one already kept, it's dropped and its sightings are merged
 * onto the keeper — so the survivor's sighting count reflects the cross-source
 * coverage, which then lifts its rank. Records with no vector are always kept:
 * we can't tell whether they're duplicates.
 */
export function dedupByEmbedding(
  records: ArchiveRecord[],
  vectorOf: (id: string) => Vector | undefined,
  threshold = DUPLICATE_COSINE,
): ArchiveRecord[] {
  const kept: { rec: ArchiveRecord; vec: Vector }[] = [];
  const out: ArchiveRecord[] = [];
  for (const rec of records) {
    const vec = vectorOf(rec.id);
    if (vec) {
      const dup = kept.find((k) => cosine(k.vec, vec) >= threshold);
      if (dup) {
        mergeSightings(dup.rec, rec);
        continue;
      }
      kept.push({ rec, vec });
    }
    out.push(rec);
  }
  return out;
}
