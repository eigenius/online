// Haiku relevance/significance judge (design §4 stage 6; §8). For each new
// record it scores relevance to every topic and an overall significance, with a
// structured output and a prompt-cached rubric so a batch of calls is cheap.
import Anthropic from "@anthropic-ai/sdk";
import type { Topic } from "../config.ts";
import type { ArchiveRecord } from "../types.ts";
import type { JudgeVerdict } from "./schemas.ts";
import { MODELS } from "./client.ts";

/** The stable rubric — goes in the (cached) system prompt. */
function rubric(topics: Topic[]): string {
  const lines = topics.map((t) => `- ${t.key}: ${t.label}. ${t.anchors.join(" ")}`);
  return [
    "You are a strict relevance judge for a research newsletter on AI scientists and AI",
    "engineers, neurosymbolic and hybrid AI, formal methods and verified science, and AI",
    "in the life sciences.",
    "",
    "Topics:",
    ...lines,
    "",
    "For each item, score its relevance to EACH topic from 0 (irrelevant) to 1 (squarely",
    "on-topic), give an overall significance from 0 (routine) to 1 (major/landmark), and a",
    "one-sentence rationale. Be conservative: most items score 0 for most topics.",
  ].join("\n");
}

/** JSON Schema for the structured output, built from the configured topics so
 *  the model must score every topic and nothing else. Numeric range is enforced
 *  in prompt + clamped on our side (structured outputs ignore min/max). */
function outputSchema(topics: Topic[]): Record<string, unknown> {
  const relevanceProps: Record<string, unknown> = {};
  for (const t of topics) relevanceProps[t.key] = { type: "number" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["relevance", "significance", "rationale"],
    properties: {
      relevance: {
        type: "object",
        additionalProperties: false,
        required: topics.map((t) => t.key),
        properties: relevanceProps,
      },
      significance: { type: "number" },
      rationale: { type: "string" },
    },
  };
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}

/** Coerce a parsed model response into a valid, clamped verdict. */
function normalizeVerdict(raw: unknown, topics: Topic[]): JudgeVerdict {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const relRaw =
    (obj.relevance && typeof obj.relevance === "object" ? obj.relevance : {}) as Record<
      string,
      unknown
    >;
  const relevance: Record<string, number> = {};
  for (const t of topics) relevance[t.key] = clamp01(relRaw[t.key]);
  return {
    relevance,
    significance: clamp01(obj.significance),
    rationale: typeof obj.rationale === "string" ? obj.rationale : "",
  };
}

export interface Judge {
  judge(rec: ArchiveRecord): Promise<JudgeVerdict>;
}

/** Build a judge bound to a client + topic set. The rubric system block carries
 *  `cache_control`, so repeated calls in a batch read it from cache (§8). */
export function makeJudge(client: Anthropic, topics: Topic[]): Judge {
  const system = [
    { type: "text" as const, text: rubric(topics), cache_control: { type: "ephemeral" as const } },
  ];
  const schema = outputSchema(topics);

  return {
    async judge(rec: ArchiveRecord): Promise<JudgeVerdict> {
      const res = await client.messages.create({
        model: MODELS.judge,
        max_tokens: 1024,
        system,
        output_config: { format: { type: "json_schema", schema } },
        messages: [
          {
            role: "user",
            content: `Title: ${rec.title}\n\nAbstract: ${rec.abstract ?? "(none provided)"}`,
          },
        ],
      });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        // fall through to a zeroed verdict
      }
      return normalizeVerdict(parsed, topics);
    },
  };
}
