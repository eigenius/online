// Curated-links adapter (design §3): a plain list of URLs the editor wants
// pulled into the archive — e.g. a paper an article responds to. Unlike the
// discovery sources, these are editorially chosen, so harvest lets them bypass
// the keyword gate (see jobs/harvest.ts). Each URL flows through the same
// normalize → page-fetch → embed → archive path as everything else; the
// page-fetch step fills in the real title and abstract.
import type { Candidate, SourceKind, TopicKey } from "../types.ts";
import type { SourceAdapter, Watermark } from "./adapter.ts";

/** A curated entry: a bare URL, or a URL with overrides. */
export type LinkEntry = string | {
  url: string;
  title?: string;
  sourceKind?: SourceKind;
  /** Topics to tag it with (curated links skip the keyword gate). */
  topics?: TopicKey[];
};

export interface LinksConfig {
  id: string;
  urls: LinkEntry[];
  /** Default sourceKind for entries that don't set one. Default "paper". */
  sourceKind?: SourceKind;
  /** Default topics for entries that don't set their own. */
  topics?: TopicKey[];
}

export function linksAdapter(cfg: LinksConfig): SourceAdapter {
  const defaultKind = cfg.sourceKind ?? "paper";
  return {
    id: cfg.id,
    async *since(_watermark: Watermark): AsyncIterable<Candidate> {
      for (const entry of cfg.urls) {
        const e = typeof entry === "string" ? { url: entry } : entry;
        if (!e.url) continue;
        yield {
          source: cfg.id,
          sourceKind: e.sourceKind ?? defaultKind,
          url: e.url,
          title: e.title ?? e.url, // weak title → page-fetch fills the real one
          authors: [],
          topics: e.topics ?? cfg.topics,
        };
      }
    },
  };
}
