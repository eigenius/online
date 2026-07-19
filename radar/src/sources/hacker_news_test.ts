import { assertEquals } from "@std/assert";
import { hitToCandidate } from "./hacker_news.ts";

Deno.test("HN hit uses the external link when present", () => {
  const c = hitToCandidate(
    {
      objectID: "1",
      title: "T",
      url: "https://ex.com/a",
      author: "u",
      created_at: "2026-07-01T12:00:00Z",
    },
    "hn",
  );
  assertEquals(c?.url, "https://ex.com/a");
  assertEquals(c?.authors, ["u"]);
  assertEquals(c?.publishedAt, "2026-07-01");
});

Deno.test("HN self-post falls back to the discussion permalink and strips story_text", () => {
  const c = hitToCandidate({
    objectID: "42",
    title: "Ask HN",
    url: null,
    story_text: "<p>hi &amp; bye</p>",
  }, "hn");
  assertEquals(c?.url, "https://news.ycombinator.com/item?id=42");
  assertEquals(c?.abstract, "hi & bye");
});

Deno.test("HN hit with no title is dropped", () => {
  assertEquals(hitToCandidate({ objectID: "1" }, "hn"), null);
});
