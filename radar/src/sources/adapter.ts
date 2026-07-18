import type { Candidate } from "../types.ts";

/** An opaque, per-adapter resume cursor (highest date seen, an API token, etc.). */
export interface Watermark {
  value?: string;
}

/** A harvest source: emits candidates newer than the given watermark (§3, §6.1). */
export interface SourceAdapter {
  readonly id: string;
  since(watermark: Watermark): AsyncIterable<Candidate>;
}
