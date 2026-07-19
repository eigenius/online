// Opus topic-gap recommendations (design §4, stage 11; §8). Given the week's
// notable items and the topics the site has already covered, it proposes new
// article/blog topics — the standing backlog side-output.
import Anthropic from "@anthropic-ai/sdk";
import type { ArchiveRecord } from "../types.ts";
import type { TopicRecommendation } from "./schemas.ts";
import { MODELS } from "./client.ts";
import { withStyle } from "../style.ts";

const SYSTEM = "You are the editor planning future articles and blog posts for a research " +
  "site on AI scientists and AI engineers, neurosymbolic and hybrid AI, formal methods " +
  "and verified science, and AI in the life sciences. Given items surfaced this week " +
  "and the titles the site has ALREADY published, propose 2-4 new article or " +
  "blog-post topics that are timely, fit the site's focus, and are NOT already " +
  "covered. Each needs a concrete working title, a one-to-two sentence " +
  "rationale, and 1-3 supporting source URLs drawn from the recent items.";

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["recommendations"],
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "rationale", "sources"],
        properties: {
          topic: { type: "string" },
          rationale: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

export async function recommend(
  client: Anthropic,
  recent: ArchiveRecord[],
  covered: string[],
  style = "",
): Promise<TopicRecommendation[]> {
  const recentBlock = recent
    .map((r) =>
      `- ${r.title} [${r.topics.join(", ")}] ${r.url}\n    ${
        r.editorial?.summary ?? r.abstract ?? ""
      }`
    )
    .join("\n");
  const coveredBlock = covered.length ? covered.map((t) => `- ${t}`).join("\n") : "(none yet)";

  const res = await client.messages.create({
    model: MODELS.recommend,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: [{
      type: "text",
      text: withStyle(style, SYSTEM),
      cache_control: { type: "ephemeral" },
    }],
    messages: [
      {
        role: "user",
        content: `Already published (do not duplicate):\n${coveredBlock}\n\n` +
          `Recent items this week:\n${recentBlock}\n\nPropose new topics.`,
      },
    ],
  });

  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = JSON.parse(text) as { recommendations?: TopicRecommendation[] };
  return (parsed.recommendations ?? []).map((r) => ({
    topic: String(r.topic ?? ""),
    rationale: String(r.rationale ?? ""),
    sources: Array.isArray(r.sources) ? r.sources.map(String) : [],
  }));
}
