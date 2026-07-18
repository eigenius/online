// Derived index — archive tier 4 (§6.2). libSQL gives native vector search and
// FTS5 behind one client, local-file now and hosted Turso later by changing
// only the URL (§6.6). Rebuilt from the committed JSONL/snapshots/vectors, so
// it is disposable and never committed.
import { type Client, createClient } from "@libsql/client";

export function openIndex(url = "file:archive/index.db"): Client {
  return createClient({ url });
}

/** Recreate the index tables (records, sightings, signals, entities, edges),
 *  the FTS5 virtual table, and the vector column, then load from the
 *  RecordStore + VectorStore. Stub — Phase 0/1. */
export function rebuildIndex(_client: Client): Promise<void> {
  throw new Error("rebuildIndex not implemented (Phase 0/1)");
}
