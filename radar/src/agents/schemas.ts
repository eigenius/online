// Zod schemas for the agents' structured outputs (design §8). Validation
// happens at the tool-call layer, so the model retries on mismatch.
import { z } from "zod";

/** Verdict from the relevance/significance judge (§4, stage 6). */
export const JudgeVerdict = z.object({
  relevance: z.record(z.string(), z.number().min(0).max(1)),
  significance: z.number().min(0).max(1),
  rationale: z.string(),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdict>;

/** Result of the adversarial faithfulness check (§4, stage 8). */
export const FaithfulnessCheck = z.object({
  supported: z.boolean(),
  unsupportedClaims: z.array(z.string()).default([]),
});
export type FaithfulnessCheck = z.infer<typeof FaithfulnessCheck>;

/** A single topic recommendation (§4, stage 11). */
export const TopicRecommendation = z.object({
  topic: z.string(),
  rationale: z.string(),
  sources: z.array(z.string()),
});
export type TopicRecommendation = z.infer<typeof TopicRecommendation>;
