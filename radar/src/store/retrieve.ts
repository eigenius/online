// Retrieval over the derived index (design §6.4): relational "new this week",
// FTS5 keyword (BM25), JS-cosine vector search, and reciprocal-rank-fusion
// hybrid. The archive record is partially reconstructed from index rows
// (authors/sightings aren't indexed — read the JSONL when those are needed).
import type { Client, Row } from "@libsql/client";
import type { ArchiveRecord, Vector } from "../types.ts";

export interface Scored {
  record: ArchiveRecord;
  score: number;
}

/** libSQL returns BLOBs as ArrayBuffer; decode either that or a Uint8Array. */
function decodeVec(v: unknown): Vector | null {
  if (v instanceof ArrayBuffer) return new Float32Array(v);
  if (v instanceof Uint8Array) return new Float32Array(v.buffer, v.byteOffset, v.byteLength / 4);
  return null;
}

function rowToRecord(row: Row): ArchiveRecord {
  const str = (v: unknown) => (v == null ? undefined : String(v));
  return {
    id: String(row.id),
    canonical: {
      type: String(row.canonical_type) as ArchiveRecord["canonical"]["type"],
      value: String(row.canonical_value),
    },
    title: str(row.title) ?? "",
    authors: [],
    url: str(row.url) ?? "",
    sourceKind: (str(row.source_kind) ?? "news") as ArchiveRecord["sourceKind"],
    publishedAt: str(row.published_at),
    firstSeen: String(row.first_seen),
    abstract: str(row.abstract),
    topics: row.topics ? JSON.parse(String(row.topics)) as string[] : [],
    sightings: [],
    signals: row.significance != null ? { significance: Number(row.significance) } : {},
  };
}

/** Records first seen at or after `sinceIso`, newest first (§6.4). */
export async function newSince(client: Client, sinceIso: string): Promise<ArchiveRecord[]> {
  const res = await client.execute({
    sql: "SELECT * FROM records WHERE first_seen >= ? ORDER BY first_seen DESC",
    args: [sinceIso],
  });
  return res.rows.map(rowToRecord);
}

/** Build a safe FTS5 MATCH expression: OR of the query's word tokens. */
function ftsQuery(query: string): string {
  const terms = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((t) => t.length > 1);
  return terms.length > 0 ? terms.map((t) => `"${t}"`).join(" OR ") : '""';
}

/** BM25 keyword search over title + abstract (§6.4). Higher score = better. */
export async function keywordSearch(client: Client, query: string, k = 20): Promise<Scored[]> {
  const res = await client.execute({
    sql: `SELECT r.*, bm25(records_fts) AS rank
          FROM records_fts JOIN records r ON r.id = records_fts.id
          WHERE records_fts MATCH ? ORDER BY rank LIMIT ?`,
    args: [ftsQuery(query), k],
  });
  return res.rows.map((row) => ({ record: rowToRecord(row), score: -Number(row.rank) }));
}

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

/** Cosine vector search over all embedded records (§6.4). */
export async function vectorSearch(client: Client, queryVec: Vector, k = 20): Promise<Scored[]> {
  const res = await client.execute("SELECT * FROM records WHERE embedding IS NOT NULL");
  const scored: Scored[] = [];
  for (const row of res.rows) {
    const v = decodeVec(row.embedding);
    if (v) scored.push({ record: rowToRecord(row), score: cosine(queryVec, v) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Hybrid retrieval (§6.4): fuse BM25 and vector rankings with reciprocal-rank
 * fusion. Embeddings catch paraphrase; BM25 catches exact terms.
 */
export async function hybridSearch(
  client: Client,
  query: string,
  queryVec: Vector | null,
  k = 20,
): Promise<ArchiveRecord[]> {
  const RRF_K = 60;
  const fused = new Map<string, { record: ArchiveRecord; score: number }>();
  const fuse = (list: Scored[]) => {
    list.forEach((s, i) => {
      const rrf = 1 / (RRF_K + i + 1);
      const cur = fused.get(s.record.id);
      if (cur) cur.score += rrf;
      else fused.set(s.record.id, { record: s.record, score: rrf });
    });
  };

  fuse(await keywordSearch(client, query, 50));
  if (queryVec) fuse(await vectorSearch(client, queryVec, 50));

  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.record);
}
