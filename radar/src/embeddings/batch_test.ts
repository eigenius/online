import { assertEquals } from "@std/assert";
import { batchByTokens, CHARS_PER_TOKEN } from "./batch.ts";

// One "token" worth of characters, so budgets are easy to reason about in tests.
const T = Math.ceil(CHARS_PER_TOKEN);
const text = (tokens: number) => "x".repeat(tokens * T);

Deno.test("packs everything under budget into a single batch", () => {
  const batches = batchByTokens([text(10), text(10), text(10)], 100);
  assertEquals(batches.length, 1);
  assertEquals(batches[0].length, 3);
});

Deno.test("splits when the running total would exceed the budget", () => {
  // each ~40 tokens, budget 100 -> 2 fit (80), the 3rd starts a new batch.
  const inputs = [text(40), text(40), text(40), text(40)];
  const batches = batchByTokens(inputs, 100);
  assertEquals(batches.map((b) => b.length), [2, 2]);
  assertEquals(batches.flat(), inputs); // order + completeness preserved
});

Deno.test("an oversized single text still gets its own batch", () => {
  const batches = batchByTokens([text(500)], 100);
  assertEquals(batches.length, 1);
  assertEquals(batches[0].length, 1);
});

Deno.test("empty input yields no batches", () => {
  assertEquals(batchByTokens([], 100), []);
});
