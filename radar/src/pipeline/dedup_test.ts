import { assertEquals } from "@std/assert";
import type { ArchiveRecord, Sighting, Vector } from "../types.ts";
import { dedupByEmbedding } from "./dedup.ts";

function rec(id: string, ...urls: string[]): ArchiveRecord {
  const sightings: Sighting[] = urls.map((url) => ({
    source: "s",
    url,
    seen: "2026-07-17T00:00:00Z",
  }));
  return {
    id,
    canonical: { type: "url", value: id },
    title: id,
    authors: [],
    sourceKind: "news",
    url: urls[0] ?? id,
    firstSeen: "2026-07-17T00:00:00Z",
    topics: [],
    sightings,
    signals: {},
  };
}

const vecs: Record<string, Vector> = {
  a: new Float32Array([1, 0, 0]),
  b: new Float32Array([1, 0, 0]), // identical to a -> duplicate
  c: new Float32Array([0, 1, 0]), // orthogonal -> distinct
};
const vectorOf = (id: string): Vector | undefined => vecs[id];

Deno.test("collapses records above the similarity threshold, keeps distinct ones", () => {
  const out = dedupByEmbedding([rec("a", "ua"), rec("b", "ub"), rec("c", "uc")], vectorOf);
  assertEquals(out.map((r) => r.id), ["a", "c"]);
});

Deno.test("merges the dropped duplicate's sightings onto the survivor", () => {
  const out = dedupByEmbedding([rec("a", "ua"), rec("b", "ub")], vectorOf);
  assertEquals(out.length, 1);
  assertEquals(out[0].sightings.map((s) => s.url).sort(), ["ua", "ub"]); // b's sighting merged in
});

Deno.test("sighting merge dedups by url", () => {
  const out = dedupByEmbedding([rec("a", "shared"), rec("b", "shared")], vectorOf);
  assertEquals(out[0].sightings.length, 1); // same url -> not doubled
});

Deno.test("records without a vector are always kept", () => {
  const out = dedupByEmbedding([rec("a", "ua"), rec("b", "ub"), rec("x", "ux")], vectorOf);
  assertEquals(out.map((r) => r.id).sort(), ["a", "x"]); // x has no vector -> kept; b collapsed into a
});

Deno.test("a high threshold keeps everything", () => {
  const out = dedupByEmbedding([rec("a", "ua"), rec("b", "ub")], vectorOf, 1.01);
  assertEquals(out.map((r) => r.id), ["a", "b"]);
});
