// Backfill embeddings for archived records that have no vector (design §6.5,
// "compute once"). Closes the gap left by a `harvest --no-embed` run or an
// embedding change: harvest dedups by id and never revisits an archived record,
// so a vector it skipped would otherwise never be computed. Idempotent —
// records that already have a vector are left untouched.
import { RecordStore } from "../store/records.ts";
import { VectorStore } from "../store/vectors.ts";
import { vertexEmbedder } from "../embeddings/vertex.ts";
import { EMBED_BATCH, embedText, type JobOptions } from "./harvest.ts";
import type { ArchiveRecord } from "../types.ts";

export async function backfill(opts: JobOptions = {}): Promise<void> {
  const archiveDir = opts.archiveDir ?? "archive";
  const records = new RecordStore(archiveDir);
  const vectors = new VectorStore(archiveDir);

  // Ids that already have a vector.
  const haveVector = new Set<string>();
  for await (const v of vectors.all()) haveVector.add(v.id);

  // Archived records missing one (dedup by id — the record log is append-only).
  const missing: ArchiveRecord[] = [];
  const seen = new Set<string>();
  for await (const rec of records.all()) {
    if (haveVector.has(rec.id) || seen.has(rec.id)) continue;
    seen.add(rec.id);
    missing.push(rec);
  }

  if (missing.length === 0) {
    console.log("backfill: every archived record already has a vector — nothing to do");
    return;
  }
  if (opts.dryRun) {
    console.log(
      `backfill: ${missing.length} record(s) missing a vector (dry run — nothing written)`,
    );
    return;
  }

  const embedder = vertexEmbedder();
  let done = 0;
  for (let i = 0; i < missing.length; i += EMBED_BATCH) {
    const batch = missing.slice(i, i + EMBED_BATCH);
    const vecs = await embedder.embed(batch.map(embedText));
    for (let j = 0; j < batch.length; j++) {
      await vectors.append(batch[j].id, embedder.id, batch[j].firstSeen, vecs[j]);
      done++;
    }
  }
  console.log(`backfill: embedded ${done} record(s) (${embedder.id}) -> ${archiveDir}/vectors`);
}
