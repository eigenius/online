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
  assertEquals(Number(score(bare).toFixed(2)), 0.02); // 0.10 * (1/5)
});

Deno.test("score weights relevance, significance, sightings, and citations", () => {
  // 0.45*1 + 0.30*1 + 0.10*(5/5) = 0.85  (no citation velocity)
  assertEquals(Number(score(rec("max", 1, 1, 5)).toFixed(2)), 0.85);
  // 0.45*1 + 0.10*(1/5) = 0.47
  assertEquals(Number(score(rec("rel", 1, 0, 1)).toFixed(2)), 0.47);
});

Deno.test("citation velocity contributes to score", () => {
  const r = rec("c", 0, 0, 0);
  r.signals = { citationVelocity: 20 }; // capped -> full 0.15 weight
  assertEquals(Number(score(r).toFixed(2)), 0.15);
});

Deno.test("rank orders by score, highest first", () => {
  const ranked = rank([rec("low", 0.1, 0.1), rec("high", 0.9, 0.9), rec("mid", 0.5, 0.5)]);
  assertEquals(ranked.map((r) => r.record.id), ["high", "mid", "low"]);
});
