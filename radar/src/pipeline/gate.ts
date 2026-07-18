import type { Topic } from "../config.ts";
import type { ArchiveRecord, TopicKey } from "../types.ts";

/**
 * Cheap first-pass relevance gate (design §4, stage 4): keyword match against
 * the topic anchors. Deliberately recall-biased — it only drops the obviously
 * off-topic; the LLM judge (§8) does the precise filtering. Returns the topic
 * keys the record plausibly belongs to (empty ⇒ drop).
 */
export function gate(rec: ArchiveRecord, topics: Topic[]): TopicKey[] {
  const hay = `${rec.title} ${rec.abstract ?? ""}`.toLowerCase();
  const hits: TopicKey[] = [];
  for (const t of topics) {
    if (t.keywords.some((k) => hay.includes(k.toLowerCase()))) hits.push(t.key);
  }
  return hits;
}
