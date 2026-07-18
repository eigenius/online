/** One web-search result (design §6.1.1). */
export interface SearchHit {
  url: string;
  title?: string;
  snippet?: string;
}

/** A web-search discovery backend — Exa / Tavily / Brave / Bing (§6.1.1, §14.6). */
export interface SearchProvider {
  readonly id: string;
  search(query: string, since?: string): Promise<SearchHit[]>;
}
