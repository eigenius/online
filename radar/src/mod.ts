// Barrel: the public surface, and the typecheck entry that pulls in every
// module (including the not-yet-imported stubs) so `deno task check` covers them.
export * from "./types.ts";
export * from "./config.ts";

export * from "./sources/adapter.ts";
export * from "./sources/arxiv.ts";
export * from "./sources/rss.ts";
export * from "./sources/registry.ts";
export * from "./sources/search/provider.ts";
export * from "./sources/search/exa.ts";

export * from "./fetch/http.ts";
export * from "./fetch/robots.ts";
export * from "./fetch/extract.ts";

export * from "./pipeline/normalize.ts";
export * from "./pipeline/dedup.ts";
export * from "./pipeline/gate.ts";
export * from "./pipeline/rank.ts";

export * from "./store/records.ts";
export * from "./store/snapshots.ts";
export * from "./store/vectors.ts";
export * from "./store/index.ts";
export * from "./store/retrieve.ts";

export * from "./embeddings/embedder.ts";
export * from "./embeddings/vertex.ts";

export * from "./entities/extract.ts";
export * from "./entities/resolve.ts";
export * from "./entities/graph.ts";

export * from "./agents/client.ts";
export * from "./agents/schemas.ts";
export * from "./agents/judge.ts";
export * from "./agents/summarize.ts";
export * from "./agents/verify.ts";
export * from "./agents/select.ts";
export * from "./agents/recommend.ts";

export * from "./render/newsletter.ts";
export * from "./render/schema.ts";
export * from "./render/entities.ts";
export * from "./publish/github.ts";

export * from "./jobs/harvest.ts";
export * from "./jobs/digest.ts";
export * from "./jobs/assemble.ts";
