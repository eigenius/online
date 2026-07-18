import type { SourceConfig } from "../config.ts";
import type { SourceKind } from "../types.ts";
import type { SourceAdapter } from "./adapter.ts";
import { arxivAdapter, type ArxivConfig } from "./arxiv.ts";
import { rssAdapter } from "./rss.ts";

/** Build harvest adapters from the source registry (§3). arxiv and rss are
 *  wired up; other kinds warn and are skipped until their adapter lands. */
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
      case "rss": {
        const cfg = s as SourceConfig & { url?: string; sourceKind?: SourceKind };
        if (!cfg.url) {
          console.warn(`rss source "${s.id}" has no url, skipping`);
          break;
        }
        adapters.push(rssAdapter({
          id: s.id,
          url: cfg.url,
          sourceKind: cfg.sourceKind ?? "news",
        }));
        break;
      }
      default:
        console.warn(`source kind not yet implemented, skipping: ${s.kind} (${s.id})`);
    }
  }
  return adapters;
}
