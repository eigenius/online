import { assertEquals } from "@std/assert";
import { linksAdapter } from "./links.ts";
import type { Candidate } from "../types.ts";

async function collect(a: AsyncIterable<Candidate>): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for await (const c of a) out.push(c);
  return out;
}

Deno.test("bare-string entry yields a candidate with defaults", async () => {
  const out = await collect(
    linksAdapter({ id: "curated", urls: ["https://example.com/x"] }).since({}),
  );
  assertEquals(out.length, 1);
  assertEquals(out[0], {
    source: "curated",
    sourceKind: "paper", // default
    url: "https://example.com/x",
    title: "https://example.com/x", // weak title, page-fetch fills it
    authors: [],
    topics: undefined,
  });
});

Deno.test("object entry overrides + source-level topics fallback", async () => {
  const out = await collect(
    linksAdapter({
      id: "curated",
      sourceKind: "news",
      topics: ["formal-rigor"],
      urls: [
        { url: "https://a.test", title: "A", sourceKind: "opinion", topics: ["agentic-ai"] },
        { url: "https://b.test" }, // inherits source defaults
      ],
    }).since({}),
  );
  assertEquals(out[0].title, "A");
  assertEquals(out[0].sourceKind, "opinion");
  assertEquals(out[0].topics, ["agentic-ai"]);
  assertEquals(out[1].sourceKind, "news"); // source default
  assertEquals(out[1].topics, ["formal-rigor"]); // source default topics
});
