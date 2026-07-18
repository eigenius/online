import type { FaithfulnessCheck } from "./schemas.ts";

/**
 * Adversarial faithfulness check (design §4, stage 8) — a *separate* call from
 * the summarizer, prompted to find unsupported claims and default to
 * "not supported" when uncertain. This is the mechanism behind "the newsletter
 * shows its work." Stub — Phase 3.
 */
export function verify(_summary: string, _sourceText: string): Promise<FaithfulnessCheck> {
  throw new Error("verify not implemented (Phase 3)");
}
