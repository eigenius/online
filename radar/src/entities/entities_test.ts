import { assertEquals } from "@std/assert";
import type { ArchiveRecord, Edge } from "../types.ts";
import { entitySlug, extractEntities, slug, sourceHost } from "./extract.ts";
import { resolveEntities } from "./resolve.ts";
import { salience } from "./graph.ts";

function rec(id: string, authors: string[], url: string, topics: string[]): ArchiveRecord {
  return {
    id,
    canonical: { type: "url", value: id },
    title: id,
    authors,
    sourceKind: "preprint",
    url,
    firstSeen: "2026-07-17T00:00:00Z",
    topics,
    sightings: [],
    signals: {},
  };
}

Deno.test("sourceHost strips www and lowercases", () => {
  assertEquals(sourceHost("https://www.Nature.com/x"), "nature.com");
  assertEquals(sourceHost("not a url"), null);
});

Deno.test("slug + entitySlug", () => {
  assertEquals(slug("José Ñ"), "jose-n");
  assertEquals(entitySlug("person:name:john-smith"), "john-smith");
  assertEquals(entitySlug("source:nature.com"), "nature-com");
  assertEquals(entitySlug("research:neurosymbolic"), "neurosymbolic");
});

Deno.test("extractEntities yields person/source/research entities + edges", () => {
  const { entities, edges } = extractEntities(
    rec("r1", ["Jane Roe"], "https://arxiv.org/abs/1", ["neurosymbolic"]),
  );
  assertEquals(entities.map((e) => e.id).sort(), [
    "person:name:jane-roe",
    "research:neurosymbolic",
    "source:arxiv.org",
  ]);
  assertEquals(edges.map((e) => e.rel).sort(), ["about", "authored_by", "published_on"]);
});

Deno.test("resolveEntities merges by id and unions aliases (no fuzzy merge)", () => {
  const a = extractEntities(rec("r1", ["Jane Roe"], "https://arxiv.org/abs/1", ["nesy"]));
  const b = extractEntities(rec("r2", ["Jane Roe"], "https://arxiv.org/abs/2", ["nesy"]));
  const c = extractEntities(rec("r3", ["J. Roe"], "https://arxiv.org/abs/3", ["nesy"])); // variant spelling
  const resolved = resolveEntities([...a.entities, ...b.entities, ...c.entities]);
  const persons = resolved.filter((e) => e.kind === "person").map((e) => e.id).sort();
  assertEquals(persons, ["person:name:j-roe", "person:name:jane-roe"]); // variant stays separate
  assertEquals(resolved.filter((e) => e.kind === "source").length, 1); // same domain merged
});

Deno.test("salience counts one record once and computes a trend", () => {
  const edges: Edge[] = [
    { from: "recent1", rel: "about", to: "research:x" },
    { from: "recent1", rel: "about", to: "research:x" }, // dup edge -> counts once
    { from: "recent2", rel: "about", to: "research:x" },
    { from: "old1", rel: "about", to: "research:x" },
  ];
  const dates = new Map([
    ["recent1", "2026-07-10"],
    ["recent2", "2026-07-12"],
    ["old1", "2026-06-01"], // ~45 days before "now" -> prior window
  ]);
  const s = salience(edges, dates, "2026-07-17T00:00:00Z").get("research:x")!;
  assertEquals(s.itemsTotal, 3);
  assertEquals(s.items30d, 2);
  assertEquals(s.trend, "rising"); // 2 recent vs 1 prior
});
