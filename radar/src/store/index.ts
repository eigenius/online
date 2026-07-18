// Derived index — archive tier 4 (§6.2). libSQL gives relational + FTS5 behind
// one client, local-file now and hosted Turso later by changing only the URL
// (§6.6). Rebuilt from the committed JSONL/snapshots/vectors, so it is
// disposable and never committed. Vector similarity is done in JS (§6.4) —
// native libSQL vector indexing is the scale-up when the archive grows.
import { type Client, createClient, type InStatement } from "@libsql/client";
import { RecordStore } from "./records.ts";
import { VectorStore } from "./vectors.ts";

export function openIndex(url = "file:archive/index.db"): Client {
  return createClient({ url });
}

const SCHEMA = [
  "DROP TABLE IF EXISTS records",
  "DROP TABLE IF EXISTS records_fts",
  `CREATE TABLE records (
     id TEXT PRIMARY KEY,
     canonical_type TEXT, canonical_value TEXT,
     title TEXT, url TEXT, source_kind TEXT,
     published_at TEXT, first_seen TEXT,
     abstract TEXT, topics TEXT, significance REAL,
     embedding BLOB
   )`,
  "CREATE INDEX records_first_seen ON records(first_seen)",
  "CREATE VIRTUAL TABLE records_fts USING fts5(id UNINDEXED, title, abstract)",
];

/**
 * Recreate the index from the source-of-truth files (§6.2). Loads every record
 * and its embedding, writing the relational + FTS5 tables. Returns counts.
 */
export async function rebuildIndex(
  client: Client,
  archiveDir: string,
): Promise<{ records: number; vectors: number }> {
  for (const stmt of SCHEMA) await client.execute(stmt);

  const vectors = new Map<string, Float32Array>();
  for await (const v of new VectorStore(archiveDir).all()) {
    vectors.set(v.id, new Float32Array(v.vec));
  }

  let records = 0;
  let withVec = 0;
  let batch: InStatement[] = [];
  const flush = async () => {
    if (batch.length > 0) {
      await client.batch(batch, "write");
      batch = [];
    }
  };

  for await (const rec of new RecordStore(archiveDir).all()) {
    const vec = vectors.get(rec.id);
    if (vec) withVec++;
    batch.push({
      sql: `INSERT OR REPLACE INTO records
        (id, canonical_type, canonical_value, title, url, source_kind,
         published_at, first_seen, abstract, topics, significance, embedding)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        rec.id,
        rec.canonical.type,
        rec.canonical.value,
        rec.title,
        rec.url,
        rec.sourceKind,
        rec.publishedAt ?? null,
        rec.firstSeen,
        rec.abstract ?? null,
        JSON.stringify(rec.topics),
        rec.signals.significance ?? null,
        vec ? new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength) : null,
      ],
    });
    batch.push({
      sql: "INSERT INTO records_fts (id, title, abstract) VALUES (?,?,?)",
      args: [rec.id, rec.title, rec.abstract ?? ""],
    });
    records++;
    if (batch.length >= 100) await flush();
  }
  await flush();
  return { records, vectors: withVec };
}
