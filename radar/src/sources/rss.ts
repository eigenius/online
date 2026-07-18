import type { Candidate, SourceKind } from "../types.ts";
import type { SourceAdapter, Watermark } from "./adapter.ts";

/**
 * Generic RSS/Atom adapter for org and researcher blogs (§3, §6.1). Stub —
 * parse the feed with `@libs/xml` the same way `arxiv.ts` does, mapping
 * items/entries to candidates.
 */
export function rssAdapter(_opts: { url: string; sourceKind: SourceKind }): SourceAdapter {
  return {
    id: "rss",
    // deno-lint-ignore require-yield
    async *since(_watermark: Watermark): AsyncIterable<Candidate> {
      throw new Error("rssAdapter not implemented (Phase 0/1)");
    },
  };
}
