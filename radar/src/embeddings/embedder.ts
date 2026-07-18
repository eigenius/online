import type { Vector } from "../types.ts";

/** An embeddings backend (design §6.5). Swappable — Voyage now, another
 *  provider or a local model later — behind this interface. */
export interface Embedder {
  readonly id: string;
  embed(texts: string[]): Promise<Vector[]>;
}
