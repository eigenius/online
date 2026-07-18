import { assertEquals } from "@std/assert";
import type { ArchiveRecord, Sighting } from "../types.ts";
import { rank, score } from "./rank.ts";

function rec(
  id: string,
  relevance: number,
  significance: number,
  sightings = 1,
): ArchiveRecord {
  const sight: Sighting = { source: "arxiv", url: "u", seen: "2026-07-17T00:00:00Z" };
  return {
    id,
    canonical: { type: "url", value: id },
    title: id,
    authors: [],
    sourceKind: "preprint",
    url: "u",
    firstSeen: "2026-07-17T00:00:00Z",
    topics: [],
    sightings: Array(sightings).fill(sight),
    signals: { relevance: { neurosymbolic: relevance }, significance },
  };
}

Deno.test("score is 0 with no signals and no sightings", () => {
  const bare = rec("x", 0, 0, 0);
  bare.signals = {};
  assertEquals(score(bare), 0);
});

Deno.test("a lone sighting contributes a small baseline", () => {
  const bare = rec("x", 0, 0, 1);
  bare.signals = {};
  assertEquals(Number(score(bare).toFixed(2)), 0.03); // 0.15 * (1/5)
});

Deno.test("score weights relevance, significance, and sightings", () => {
  // 0.5*1 + 0.35*1 + 0.15*(5/5) = 1.0
  assertEquals(score(rec("max", 1, 1, 5)), 1);
  // 0.5*1 + 0.35*0 + 0.15*(1/5) = 0.53
  assertEquals(Number(score(rec("rel", 1, 0, 1)).toFixed(2)), 0.53);
});

Deno.test("rank orders by score, highest first", () => {
  const ranked = rank([rec("low", 0.1, 0.1), rec("high", 0.9, 0.9), rec("mid", 0.5, 0.5)]);
  assertEquals(ranked.map((r) => r.record.id), ["high", "mid", "low"]);
});
