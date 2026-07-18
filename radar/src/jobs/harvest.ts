// DAILY harvest (design §4, daily rhythm). Deterministic apart from embeddings:
// sources → normalize → cheap gate → embed (Vertex) → archive record + vector.
// Idempotent: records already in the archive are skipped, so a re-run neither
// duplicates records nor re-calls the embeddings API (§6.5, "compute once").
import { loadConfig } from "../config.ts";
import { buildAdapters } from "../sources/registry.ts";
import { normalize } from "../pipeline/normalize.ts";
import { gate } from "../pipeline/gate.ts";
import { RecordStore } from "../store/records.ts";
import { VectorStore } from "../store/vectors.ts";
import { SnapshotStore } from "../store/snapshots.ts";
import { extractMainText } from "../fetch/extract.ts";
import { isAllowed } from "../fetch/robots.ts";
import { httpGet } from "../fetch/http.ts";
import { vertexEmbedder } from "../embeddings/vertex.ts";
import type { Embedder } from "../embeddings/embedder.ts";
import type { ArchiveRecord } from "../types.ts";

/** Below this many chars, a feed body is a stub and we fetch the full page. */
const THIN_ABSTRACT = 1_200;

export interface JobOptions {
  configDir?: string;
  archiveDir?: string;
  dryRun?: boolean;
  /** Archive without computing embeddings (e.g. when GCP isn't configured). */
  noEmbed?: boolean;
  /** Skip fetching full page text for thin (excerpt-only) records. */
  noFetch?: boolean;
}

const EMBED_BATCH = 16;

/** Text handed to the embedder — title + abstract, capped to stay well under
 *  the per-instance token limit. */
function embedText(rec: ArchiveRecord): string {
  return `${rec.title}\n\n${rec.abstract ?? ""}`.slice(0, 8_000);
}

export async function harvest(opts: JobOptions = {}): Promise<void> {
  const cfg = await loadConfig(opts.configDir ?? "config");
  const archiveDir = opts.archiveDir ?? "archive";
  const records = new RecordStore(archiveDir);
  const vectors = new VectorStore(archiveDir);
  const adapters = buildAdapters(cfg.sources);
  const now = new Date().toISOString();

  // Canonical-id dedup (§4, stage 3): skip anything already archived, plus
  // repeats within this run. (Fuzzy/embedding dedup is still pipeline/dedup.ts.)
  const known = opts.dryRun ? new Set<string>() : await records.existingIds();
  const seenThisRun = new Set<string>();

  let seen = 0;
  let onTopic = 0;
  const fresh: ArchiveRecord[] = [];

  for (const adapter of adapters) {
    // A dead or malformed feed must not kill the whole run — log and move on.
    try {
      for await (const candidate of adapter.since({})) {
        seen++;
        const rec = await normalize(candidate, now);
        const topics = gate(rec, cfg.topics);
        if (topics.length === 0) continue; // cheap gate drop (§4, stage 4)
        onTopic++;
        if (known.has(rec.id) || seenThisRun.has(rec.id)) continue;
        seenThisRun.add(rec.id);
        rec.topics = topics;
        fresh.push(rec);
        // TODO §6.2 tier 2: fetch + store snapshot (store/snapshots.ts)
        // TODO §7: extract + resolve entities (entities/*)
      }
    } catch (err) {
      console.error(
        `harvest: source "${adapter.id}" failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // Enrich thin, non-arXiv records with full page text (design §6.2 tier 2):
  // fetch the article, extract the main text, snapshot it, and use it as the
  // record's source text. arXiv abstracts and full-content feeds are left as-is.
  let enriched = 0;
  if (!opts.dryRun && !opts.noFetch) {
    const snapshots = new SnapshotStore(archiveDir);
    for (const rec of fresh) {
      if (rec.canonical.type === "arxiv") continue;
      if ((rec.abstract?.length ?? 0) >= THIN_ABSTRACT) continue;
      try {
        if (!(await isAllowed(rec.url))) continue;
        const text = extractMainText(await httpGet(rec.url), rec.url);
        if (text.length > (rec.abstract?.length ?? 0)) {
          await snapshots.put(rec.url, now, text);
          rec.abstract = text.slice(0, 8_000);
          enriched++;
        }
      } catch (err) {
        console.error(
          `harvest: page fetch failed for ${rec.url}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  const willEmbed = !opts.dryRun && !opts.noEmbed;
  const embedder: Embedder | null = willEmbed ? vertexEmbedder() : null;

  if (!opts.dryRun) {
    for (let i = 0; i < fresh.length; i += EMBED_BATCH) {
      const batch = fresh.slice(i, i + EMBED_BATCH);
      const vecs = embedder ? await embedder.embed(batch.map(embedText)) : null;
      for (let j = 0; j < batch.length; j++) {
        const rec = batch[j];
        // Vector first, then record, so an archived record always has a vector.
        if (vecs && embedder) await vectors.append(rec.id, embedder.id, rec.firstSeen, vecs[j]);
        await records.append(rec);
      }
    }
  }

  const tail = opts.dryRun
    ? " (dry run — nothing written)"
    : willEmbed
    ? `, embedded (${embedder?.id}) + archived`
    : ", archived (no embeddings)";
  console.log(
    `harvest: ${seen} candidates from ${adapters.length} source(s), ` +
      `${onTopic} on-topic, ${fresh.length} new` +
      (enriched > 0 ? `, ${enriched} page-enriched` : "") + tail,
  );
}
