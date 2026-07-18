import { assertEquals } from "@std/assert";
import type { Topic } from "../config.ts";
import type { ArchiveRecord } from "../types.ts";
import { gate } from "./gate.ts";

function rec(title: string, abstract = ""): ArchiveRecord {
  return {
    id: "sha256:x",
    canonical: { type: "url", value: "u" },
    title,
    authors: [],
    sourceKind: "preprint",
    url: "u",
    firstSeen: "2026-07-17T00:00:00Z",
    abstract,
    topics: [],
    sightings: [],
    signals: {},
  };
}

const topics: Topic[] = [
  { key: "formal-methods", label: "FM", keywords: ["Lean", "theorem proving"], anchors: [] },
  { key: "ai-life-sciences", label: "Bio", keywords: ["protein"], anchors: [] },
];

Deno.test("gate matches a topic by keyword (case-insensitive)", () => {
  assertEquals(gate(rec("A lean proof of X"), topics), ["formal-methods"]);
});

Deno.test("gate can match multiple topics", () => {
  assertEquals(
    gate(rec("Theorem proving for protein folding"), topics).sort(),
    ["ai-life-sciences", "formal-methods"],
  );
});

Deno.test("gate drops off-topic records", () => {
  assertEquals(gate(rec("An unrelated cooking blog"), topics), []);
});
