import { assertEquals } from "@std/assert";
import { arxivId, canonicalFromUrl, doiFromUrl } from "./normalize.ts";

Deno.test("arxivId extracts the id from abs/pdf/html URLs, version-stripped", () => {
  assertEquals(arxivId("https://arxiv.org/abs/2511.09008"), "2511.09008");
  assertEquals(arxivId("https://arxiv.org/html/2511.09008v2"), "2511.09008");
  assertEquals(arxivId("https://www.arxiv.org/pdf/2607.15079v1"), "2607.15079");
  assertEquals(arxivId("http://arxiv.org/abs/math/0211159"), "math/0211159");
  assertEquals(arxivId("https://example.com/abs/2511.09008"), null);
});

Deno.test("doiFromUrl extracts DOIs from resolver URLs", () => {
  assertEquals(doiFromUrl("https://doi.org/10.1101/2026.07.01.123"), "10.1101/2026.07.01.123");
  assertEquals(doiFromUrl("https://dx.doi.org/10.1000/xyz"), "10.1000/xyz");
  assertEquals(doiFromUrl("https://example.com/10.1/x"), null);
});

Deno.test("canonicalFromUrl prefers arxiv/doi, so abs/html/pdf dedup to one id", () => {
  const a = canonicalFromUrl("https://arxiv.org/abs/2511.09008");
  const b = canonicalFromUrl("https://arxiv.org/html/2511.09008v2");
  assertEquals(a, { type: "arxiv", value: "2511.09008" });
  assertEquals(a, b); // feed and web-search forms collapse
  assertEquals(canonicalFromUrl("https://doi.org/10.1101/x"), { type: "doi", value: "10.1101/x" });
  assertEquals(canonicalFromUrl("https://nature.com/articles/x#sec2"), {
    type: "url",
    value: "https://nature.com/articles/x",
  });
});
