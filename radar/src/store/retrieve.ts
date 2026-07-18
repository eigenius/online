import type { Client } from "@libsql/client";
import type { ArchiveRecord } from "../types.ts";

/**
 * Hybrid retrieval (design §6.4): run the query through both FTS5 (BM25) and
 * the vector index, fuse with reciprocal-rank fusion, optionally rerank. Stub —
 * Phase 1.
 */
export function hybridSearch(
  _client: Client,
  _query: string,
  _topK = 50,
): Promise<ArchiveRecord[]> {
  throw new Error("hybridSearch not implemented (Phase 1)");
}
