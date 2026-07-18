// The Anthropic SDK client and the model tiers (design §8). This is the only
// place model ids live; everything else refers to MODELS.*.
import Anthropic from "@anthropic-ai/sdk";

/** Model tiers matched to each stage's cost/quality needs (§8). */
export const MODELS = {
  judge: "claude-haiku-4-5", // high-volume relevance/significance triage
  summarize: "claude-sonnet-5", // read the source + write the summary
  verify: "claude-sonnet-5", // adversarial faithfulness check
  select: "claude-opus-4-8", // editorial selection + issue framing
  recommend: "claude-opus-4-8", // topic-gap recommendations
} as const;

/** Construct the client. Reads ANTHROPIC_API_KEY from the environment. */
export function anthropic(): Anthropic {
  return new Anthropic();
}
