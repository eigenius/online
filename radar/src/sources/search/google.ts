import type { SearchHit, SearchProvider } from "./provider.ts";

// Google Programmable Search via the Custom Search JSON API (design §6.1.1) —
// the GCP-native discovery provider. Set up a Programmable Search Engine
// configured to search the whole web, then provide:
//   GOOGLE_PSE_API_KEY — an API key with the Custom Search API enabled
//   GOOGLE_PSE_CX      — the Programmable Search Engine id (cx)
// (Vertex AI Search is the heavier alternative — a search app over data stores;
// this simple query→URLs sweep doesn't need it.)
const ENDPOINT = "https://www.googleapis.com/customsearch/v1";

export interface GoogleSearchConfig {
  apiKey?: string;
  cx?: string;
  /** Results per query (Custom Search returns at most 10 per page). */
  num?: number;
}

export function googleSearchProvider(cfg: GoogleSearchConfig = {}): SearchProvider {
  const apiKey = cfg.apiKey ?? Deno.env.get("GOOGLE_PSE_API_KEY");
  const cx = cfg.cx ?? Deno.env.get("GOOGLE_PSE_CX");
  const num = String(cfg.num ?? 10);

  return {
    id: "google-pse",
    async search(query: string, since?: string): Promise<SearchHit[]> {
      if (!apiKey || !cx) {
        throw new Error("GOOGLE_PSE_API_KEY / GOOGLE_PSE_CX not set");
      }
      const params = new URLSearchParams({ key: apiKey, cx, q: query, num });
      if (since) {
        // Custom Search takes a relative window (dN); derive it from the date.
        const days = Math.ceil((Date.now() - Date.parse(since)) / 86_400_000);
        if (Number.isFinite(days)) params.set("dateRestrict", `d${Math.max(1, days)}`);
      }
      const res = await fetch(`${ENDPOINT}?${params.toString()}`);
      if (!res.ok) throw new Error(`google pse -> ${res.status}: ${await res.text()}`);
      const json = await res.json() as {
        items?: { link: string; title?: string; snippet?: string }[];
      };
      return (json.items ?? []).map((i) => ({ url: i.link, title: i.title, snippet: i.snippet }));
    },
  };
}
