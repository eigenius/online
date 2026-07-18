import type { SearchHit, SearchProvider } from "./provider.ts";

/** Exa neural search for web discovery (§6.1.1). Minimal REST client; the
 *  provider choice is still open (§14.6), so this lives behind the interface. */
export function exaProvider(): SearchProvider {
  const key = Deno.env.get("EXA_API_KEY");
  return {
    id: "exa",
    async search(query: string, _since?: string): Promise<SearchHit[]> {
      if (!key) throw new Error("EXA_API_KEY not set");
      const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "x-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ query, numResults: 20 }),
      });
      if (!res.ok) throw new Error(`exa -> ${res.status}`);
      const json = await res.json() as {
        results: { url: string; title?: string; text?: string }[];
      };
      return json.results.map((r) => ({ url: r.url, title: r.title, snippet: r.text }));
    },
  };
}
