import { assertEquals } from "@std/assert";
import { paperToCandidate } from "./biorxiv.ts";

Deno.test("bioRxiv row maps to a DOI-resolver candidate", () => {
  const c = paperToCandidate({
    doi: "10.1101/2026.07.01.123456",
    title: "A  study\n of  cells",
    authors: "Smith, J.; Doe, A.; ",
    date: "2026-07-01",
    abstract: "  abstract text ",
  }, "biorxiv");
  assertEquals(c.url, "https://doi.org/10.1101/2026.07.01.123456");
  assertEquals(c.title, "A study of cells");
  assertEquals(c.authors, ["Smith, J.", "Doe, A."]);
  assertEquals(c.canonicalHint, { type: "doi", value: "10.1101/2026.07.01.123456" });
  assertEquals(c.abstract, "abstract text");
  assertEquals(c.sourceKind, "preprint");
});
