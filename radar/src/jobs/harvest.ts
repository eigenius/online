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
import { extractMainText, extractTitle, isWeakTitle } from "../fetch/extract.ts";
import { isAllowed } from "../fetch/robots.ts";
import { httpGet } from "../fetch/http.ts";
import { vertexEmbedder } from "../embeddings/vertex.ts";
import { groundingSearchProvider } from "../sources/search/grounding.ts";
import { enrichCitations } from "../sources/semantic_scholar.ts";
import { enrichArxiv } from "../sources/arxiv.ts";
import type { Embedder } from "../embeddings/embedder.ts";
import type { ArchiveRecord, Candidate, Vector } from "../types.ts";

/** Below this many chars, a feed body is a stub and we fetch the full page. */
const THIN_ABSTRACT = 1_200;
/** Recency window for the web-search discovery sweep. */
const SEARCH_WINDOW_DAYS = 14;
/** Chars of article text kept on the record for indexing — roughly the first
 *  page. The full extracted text still goes to the snapshot; the lead is enough
 *  to embed, gate, and keyword-search on, and keeps records under the token cap. */
const FIRST_PAGE_CHARS = 3_000;

export interface JobOptions {
  configDir?: string;
  archiveDir?: string;
  dryRun?: boolean;
  /** Archive without computing embeddings (e.g. when GCP isn't configured). */
  noEmbed?: boolean;
  /** Skip fetching full page text for thin (excerpt-only) records. */
  noFetch?: boolean;
  /** Skip the web-search discovery sweep (Vertex Gemini grounding). */
  noSearch?: boolean;
  /** Skip Semantic Scholar citation enrichment. */
  noCitations?: boolean;
  /** Skip arXiv metadata enrichment. */
  noArxiv?: boolean;
}

export const EMBED_BATCH = 16;

/** Text handed to the embedder — the title plus the first page of the abstract
 *  (the lead characterizes the record; see FIRST_PAGE_CHARS). */
export function embedText(rec: ArchiveRecord): string {
  return `${rec.title}\n\n${(rec.abstract ?? "").slice(0, FIRST_PAGE_CHARS)}`;
}

export async function harvest(opts: JobOptions = {}): Promise<void> {
  const cfg = await loadConfig(opts.configDir ?? "config");
  const archiveDir = opts.archiveDir ?? "archive";
  const records = new RecordStore(archiveDir);
  const vectors = new VectorStore(archiveDir);
  const adapters = buildAdapters(cfg.sources);
  const now = new Date().toISOString();

  // Curated `links` sources are editorially chosen, so they bypass the keyword
  // gate — otherwise a manually-added URL (no text yet at gate time) would be
  // dropped as off-topic before its page is ever fetched.
  const curatedSources = new Set(
    cfg.sources.filter((s) => s.kind === "links").map((s) => s.id),
  );

  // Canonical-id dedup (§4, stage 3): skip anything already archived, plus
  // repeats within this run. (Fuzzy/embedding dedup is still pipeline/dedup.ts.)
  const known = opts.dryRun ? new Set<string>() : await records.existingIds();
  const seenThisRun = new Set<string>();

  let seen = 0;
  let onTopic = 0;
  const fresh: ArchiveRecord[] = [];

  // normalize → cheap gate → canonical-id dedup → collect. Shared by the feed/
  // API adapters and the web-search sweep. (Page-fetch/embed happen later.)
  const consider = async (candidate: Candidate): Promise<void> => {
    seen++;
    const rec = await normalize(candidate, now);
    const curated = curatedSources.has(candidate.source);
    // Editor-assigned topics win; otherwise the keyword gate assigns them.
    const topics = candidate.topics && candidate.topics.length > 0
      ? candidate.topics
      : gate(rec, cfg.topics);
    if (topics.length === 0 && !curated) return; // cheap gate drop (§4, stage 4)
    onTopic++;
    if (known.has(rec.id) || seenThisRun.has(rec.id)) return;
    seenThisRun.add(rec.id);
    rec.topics = topics;
    fresh.push(rec);
  };

  // 1. Feed / API adapters (arXiv, RSS). A dead feed must not kill the run.
  for (const adapter of adapters) {
    try {
      for await (const candidate of adapter.since({})) await consider(candidate);
    } catch (err) {
      console.error(
        `harvest: source "${adapter.id}" failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // 2. Web-search discovery sweep (§6.1.1): per-topic queries via Vertex Gemini
  //    grounding, deduped against everything above. Runs on the same GCP project
  //    as embeddings; skipped if that project isn't configured.
  const gcpProject = Deno.env.get("VERTEX_PROJECT") ?? Deno.env.get("GOOGLE_CLOUD_PROJECT");
  if (!opts.noSearch && gcpProject) {
    const provider = groundingSearchProvider();
    const since = new Date(Date.now() - SEARCH_WINDOW_DAYS * 86_400_000).toISOString();
    for (const qc of cfg.queries) {
      for (const query of qc.queries) {
        try {
          for (const hit of await provider.search(query, since)) {
            await consider({
              source: provider.id,
              sourceKind: "news",
              url: hit.url,
              title: hit.title ?? hit.url,
              authors: [],
              abstract: hit.snippet,
            });
          }
        } catch (err) {
          console.error(
            `harvest: search "${query}" failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
  } else if (!opts.noSearch) {
    console.log(
      "harvest: no GCP project (GOOGLE_CLOUD_PROJECT) — skipping grounding search discovery",
    );
  }

  // Enrich thin, non-arXiv records with page text (design §6.2 tier 2): fetch the
  // article, extract the main text, snapshot the whole thing, and keep the first
  // page as the record's abstract for indexing. arXiv abstracts and full-content
  // feeds are left as-is.
  let enriched = 0;
  if (!opts.dryRun && !opts.noFetch) {
    const snapshots = new SnapshotStore(archiveDir);
    for (const rec of fresh) {
      if (rec.canonical.type === "arxiv") continue;
      if ((rec.abstract?.length ?? 0) >= THIN_ABSTRACT) continue;
      try {
        if (!(await isAllowed(rec.url))) continue;
        const html = await httpGet(rec.url);
        const text = extractMainText(html, rec.url);
        if (text.length > (rec.abstract?.length ?? 0)) {
          await snapshots.put(rec.url, now, text); // full text preserved in the snapshot
          rec.abstract = text.slice(0, FIRST_PAGE_CHARS); // first page is enough to index
          enriched++;
        }
        // Grounding hands us a bare domain as the title; use the real headline.
        if (isWeakTitle(rec.title)) {
          const title = extractTitle(html);
          if (title) rec.title = title;
        }
      } catch (err) {
        console.error(
          `harvest: page fetch failed for ${rec.url}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  // arXiv metadata enrichment: fill authors/date/abstract for arXiv records that
  // arrived thin (e.g. via the web-search sweep, which gives only a title + snippet).
  if (!opts.dryRun && !opts.noArxiv && fresh.length > 0) {
    try {
      const n = await enrichArxiv(fresh);
      if (n > 0) console.log(`harvest: ${n} arXiv records enriched with metadata`);
    } catch (err) {
      console.error(
        `harvest: arxiv enrichment failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // Citation-velocity enrichment (Semantic Scholar) for arXiv/DOI records (§4, stage 7).
  if (!opts.dryRun && !opts.noCitations && fresh.length > 0) {
    try {
      const n = await enrichCitations(fresh);
      if (n > 0) console.log(`harvest: ${n} records enriched with citation velocity (S2)`);
    } catch (err) {
      console.error(
        `harvest: citation enrichment failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  const willEmbed = !opts.dryRun && !opts.noEmbed;
  let embedder: Embedder | null = willEmbed ? vertexEmbedder() : null;
  const embedderId = embedder?.id;
  let embedFailed = false;

  if (!opts.dryRun) {
    for (let i = 0; i < fresh.length; i += EMBED_BATCH) {
      const batch = fresh.slice(i, i + EMBED_BATCH);
      let vecs: Vector[] | null = null;
      if (embedder) {
        try {
          vecs = await embedder.embed(batch.map(embedText));
        } catch (err) {
          // Don't lose the whole harvest to a transient embeddings outage (an
          // expired GCP token, a 5xx): archive the records now without vectors
          // and let `backfill` embed them later. Stop retrying after the first
          // failure so we don't hammer a dead endpoint.
          console.error(
            `harvest: embedding failed — archiving without vectors, run \`backfill\` later: ${
              err instanceof Error ? err.message : err
            }`,
          );
          embedder = null;
          embedFailed = true;
        }
      }
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
    : embedFailed
    ? ", archived WITHOUT vectors (embedding failed — run `backfill`)"
    : willEmbed
    ? `, embedded (${embedderId}) + archived`
    : ", archived (no embeddings)";
  console.log(
    `harvest: ${seen} candidates from ${adapters.length} source(s), ` +
      `${onTopic} on-topic, ${fresh.length} new` +
      (enriched > 0 ? `, ${enriched} page-enriched` : "") + tail,
  );
}
