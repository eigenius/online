import type { ArchiveRecord } from "../types.ts";

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
