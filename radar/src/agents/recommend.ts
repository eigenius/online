import type { ArchiveRecord } from "../types.ts";
import type { TopicRecommendation } from "./schemas.ts";

/**
 * Opus topic-gap recommendations (design §4, stage 11; §8): clusters recent
 * entries, contrasts them with what the site has already published, and
 * proposes article/blog topics with supporting sources. Stub — Phase 3.
 */
export function recommend(_recent: ArchiveRecord[]): Promise<TopicRecommendation[]> {
  throw new Error("recommend not implemented (Phase 3)");
}
