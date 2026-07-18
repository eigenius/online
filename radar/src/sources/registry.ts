import type { SourceConfig } from "../config.ts";
import type { SourceAdapter } from "./adapter.ts";
import { arxivAdapter, type ArxivConfig } from "./arxiv.ts";

/** Build harvest adapters from the source registry (§3). Only `arxiv` is wired
 *  up in Phase 0; other kinds warn and are skipped until their adapter lands. */
export function buildAdapters(sources: SourceConfig[]): SourceAdapter[] {
  const adapters: SourceAdapter[] = [];
  for (const s of sources) {
    switch (s.kind) {
      case "arxiv": {
        const cfg = s as SourceConfig & Partial<ArxivConfig>;
        adapters.push(arxivAdapter({
          categories: cfg.categories ?? [],
          maxResults: cfg.maxResults,
        }));
        break;
      }
      default:
        console.warn(`source kind not yet implemented, skipping: ${s.kind} (${s.id})`);
    }
  }
  return adapters;
}
