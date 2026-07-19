import { assert, assertStringIncludes } from "@std/assert";
import type { ArchiveRecord } from "../types.ts";
import { renderIssue } from "./newsletter.ts";

function rec(over: Partial<ArchiveRecord>): ArchiveRecord {
  return {
    id: over.id ?? "x",
    canonical: { type: "url", value: over.url ?? "u" },
    title: over.title ?? "Title",
    authors: over.authors ?? [],
    sourceKind: over.sourceKind ?? "preprint",
    url: over.url ?? "https://example.com/a",
    publishedAt: over.publishedAt,
    firstSeen: "2026-07-17T00:00:00Z",
    topics: over.topics ?? ["neurosymbolic"],
    sightings: [],
    signals: {},
    editorial: over.editorial,
  };
}

const md = renderIssue({
  issue: 1,
  pubDate: "2026-07-19",
  title: "An Issue",
  description: "desc",
  intro: "The intro.",
  sections: [{
    heading: "Section One",
    context: "What they share. And more shared. How they differ. And more difference.",
    items: [
      rec({
        title: "First & <Best>",
        url: "https://www.arxiv.org/abs/1",
        authors: ["Ann A", "Bob B", "Cy C", "Dee D"],
        publishedAt: "2026-07-12",
        editorial: { summary: "A tight summary." },
      }),
      rec({ title: "Second", url: "https://nature.com/x" }),
    ],
  }],
});

Deno.test("renders a progressive-disclosure card per item", () => {
  const cards = md.match(/<details class="nl-item">/g) ?? [];
  assert(cards.length === 2, `expected 2 cards, got ${cards.length}`);
  assertStringIncludes(md, `<summary><span class="nl-item-title">`);
  assertStringIncludes(md, `<a href="https://www.arxiv.org/abs/1">Read the source →</a>`);
});

Deno.test("escapes HTML in titles and shows the summary in the body", () => {
  assertStringIncludes(md, "First &amp; &lt;Best&gt;");
  assertStringIncludes(md, "<p>A tight summary.</p>");
});

Deno.test("meta line shows authors (capped with et al.), source host, and date", () => {
  assertStringIncludes(md, "Ann A, Bob B, Cy C et al. · arxiv.org · 12 Jul 2026");
});

Deno.test("renders the section context paragraph", () => {
  assertStringIncludes(md, `<p class="nl-context">What they share.`);
});

Deno.test("a card is one contiguous HTML block (no blank line inside)", () => {
  const card = md.slice(md.indexOf("<details"), md.indexOf("</details>") + "</details>".length);
  assert(!/\n\s*\n/.test(card), "card must not contain a blank line");
});
