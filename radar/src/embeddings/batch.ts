// Pack embedding inputs into request-sized batches under Vertex's per-request
// input token cap (20k across all instances). Kept separate from vertex.ts so
// it's unit-testable without importing the auth SDK.

/** Token budget per request, with margin under the 20k cap. */
export const MAX_REQUEST_TOKENS = 18_000;
/** Deliberately conservative chars/token estimate, to under-pack rather than 400. */
export const CHARS_PER_TOKEN = 3.5;

/**
 * Split texts into batches whose combined estimated token count stays under the
 * request cap, preserving order. A single text larger than the budget still
 * goes in its own batch — we can't split one input, and the caller caps input
 * length upstream so no instance approaches the cap on its own.
 */
export function batchByTokens(texts: string[], maxTokens = MAX_REQUEST_TOKENS): string[][] {
  const batches: string[][] = [];
  let cur: string[] = [];
  let curTokens = 0;
  for (const t of texts) {
    const est = Math.ceil(t.length / CHARS_PER_TOKEN);
    if (cur.length > 0 && curTokens + est > maxTokens) {
      batches.push(cur);
      cur = [];
      curTokens = 0;
    }
    cur.push(t);
    curTokens += est;
  }
  if (cur.length > 0) batches.push(cur);
  return batches;
}
