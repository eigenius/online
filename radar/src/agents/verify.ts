// Adversarial faithfulness check (design §4, stage 8) — a *separate* call from
// the summarizer, prompted to find claims the source doesn't support and to
// default to "not supported" when uncertain. This is the mechanism behind "the
// newsletter shows its work": a summary that overreaches its source is dropped.
import Anthropic from "@anthropic-ai/sdk";
import type { FaithfulnessCheck } from "./schemas.ts";
import { MODELS } from "./client.ts";

const SYSTEM = "You are a skeptical fact-checker for a research newsletter. You are given a " +
  "SOURCE text and a SUMMARY written from it. Decide whether every factual claim " +
  "in the summary is directly supported by the source. Be adversarial: if the " +
  "summary adds detail, numbers, named entities, or conclusions not present in " +
  "the source, or generalizes beyond it, treat that as unsupported. Default to " +
  "not-supported when uncertain. Set supported=true only if the entire summary " +
  "is faithful to the source.";

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["supported", "unsupportedClaims"],
  properties: {
    supported: { type: "boolean" },
    unsupportedClaims: { type: "array", items: { type: "string" } },
  },
};

export async function verify(
  client: Anthropic,
  summary: string,
  source: string,
): Promise<FaithfulnessCheck> {
  const res = await client.messages.create({
    model: MODELS.verify,
    max_tokens: 4096, // room for adaptive thinking AND the JSON verdict (1024 truncated)
    thinking: { type: "adaptive" }, // careful reading is the whole point here
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: `SOURCE:\n${source}\n\n---\n\nSUMMARY:\n${summary}` },
    ],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  let parsed: Partial<FaithfulnessCheck> = {};
  try {
    if (!text.trim()) throw new Error("empty response");
    parsed = JSON.parse(text) as Partial<FaithfulnessCheck>;
  } catch (err) {
    // A truncated/empty verdict must not crash the run: treat it as
    // not-supported (the conservative default), so the summary is dropped and
    // assemble's one retry gets another attempt.
    console.error(
      `verify: unparseable verdict (${
        err instanceof Error ? err.message : err
      }) — treating as not-supported`,
    );
    return { supported: false, unsupportedClaims: ["verifier returned no parseable output"] };
  }
  return {
    supported: parsed.supported === true,
    unsupportedClaims: Array.isArray(parsed.unsupportedClaims)
      ? parsed.unsupportedClaims.map(String)
      : [],
  };
}
