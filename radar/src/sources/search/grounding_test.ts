import { assertEquals } from "@std/assert";
import { parseGrounding } from "./grounding.ts";

const FIXTURE = {
  candidates: [{
    groundingMetadata: {
      groundingChunks: [
        { web: { uri: "https://redir/0", title: "nesy-ai.org", domain: "nesy-ai.org" } },
        { web: { uri: "https://redir/1", title: "A Paper", domain: "arxiv.org" } },
        { web: { domain: "no-uri.example" } }, // no uri -> skipped
      ],
      groundingSupports: [
        { segment: { text: "Neurosymbolic summer school." }, groundingChunkIndices: [0] },
        { segment: { text: "Shared segment." }, groundingChunkIndices: [0, 1] },
      ],
    },
  }],
};

Deno.test("parseGrounding keeps only chunks with a URL", () => {
  assertEquals(parseGrounding(FIXTURE).length, 2);
});

Deno.test("parseGrounding joins cited segments into a per-source snippet", () => {
  const hits = parseGrounding(FIXTURE);
  assertEquals(hits[0].url, "https://redir/0");
  assertEquals(hits[0].title, "nesy-ai.org");
  assertEquals(hits[0].snippet, "Neurosymbolic summer school. Shared segment.");
  assertEquals(hits[1].snippet, "Shared segment."); // only the shared support cites chunk 1
});

Deno.test("parseGrounding tolerates empty / malformed responses", () => {
  assertEquals(parseGrounding(null), []);
  assertEquals(parseGrounding({}), []);
  assertEquals(parseGrounding({ candidates: [{}] }), []);
});
