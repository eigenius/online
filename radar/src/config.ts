// Load and validate the editor-owned YAML configs (design §2, §3, §6.1.1).
import { parse } from "@std/yaml";
import { z } from "zod";

const TopicSchema = z.object({
  key: z.string(),
  label: z.string(),
  keywords: z.array(z.string()).default([]),
  anchors: z.array(z.string()).default([]),
});
export type Topic = z.infer<typeof TopicSchema>;

const SourceSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "arxiv",
    "rss",
    "semantic_scholar",
    "crossref",
    "biorxiv",
    "hacker_news",
    "links",
  ]),
}).passthrough();
export type SourceConfig = z.infer<typeof SourceSchema>;

const QuerySchema = z.object({
  topic: z.string(),
  queries: z.array(z.string()),
});
export type QueryConfig = z.infer<typeof QuerySchema>;

export interface Config {
  topics: Topic[];
  sources: SourceConfig[];
  queries: QueryConfig[];
}

async function loadYaml<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const raw = parse(await Deno.readTextFile(path));
  return schema.parse(raw);
}

export async function loadConfig(dir = "config"): Promise<Config> {
  const topics = await loadYaml(
    `${dir}/topics.yaml`,
    z.object({ topics: z.array(TopicSchema) }),
  );
  const sources = await loadYaml(
    `${dir}/sources.yaml`,
    z.object({ sources: z.array(SourceSchema) }),
  );
  const queries = await loadYaml(
    `${dir}/queries.yaml`,
    z.object({ topics: z.array(QuerySchema) }),
  );
  return { topics: topics.topics, sources: sources.sources, queries: queries.topics };
}
