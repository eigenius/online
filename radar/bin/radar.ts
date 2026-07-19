// CLI entrypoint. The GitHub Actions workflows call these subcommands.
import { parseArgs } from "@std/cli/parse-args";
import { loadConfig } from "../src/config.ts";
import { harvest, type JobOptions } from "../src/jobs/harvest.ts";
import { digest } from "../src/jobs/digest.ts";
import { assemble } from "../src/jobs/assemble.ts";
import { backfill } from "../src/jobs/backfill.ts";
import { entities } from "../src/jobs/entities.ts";

const HELP = `radar — research-radar & newsletter pipeline

Usage:
  radar harvest   [--config <dir>] [--archive <dir>] [--dry-run] [--no-embed] [--no-fetch] [--no-search]
  radar digest    [--config <dir>] [--archive <dir>] [--since-days N] [--limit N] [--json]
  radar assemble  [--config <dir>] [--archive <dir>] [--since-days N] [--limit N] [--dry-run] [--pr] [--no-entities]
  radar doctor    [--config <dir>]     validate config + report environment
  radar rebuild-index [--archive <dir>]  rebuild the libSQL index from the archive
  radar backfill  [--archive <dir>] [--dry-run]  embed archived records missing a vector
  radar entities  [--out <file>] [--track-min N] [--dry-run]  build the entity-index extract

digest judges the week's new archive entries with Haiku and prints a raw ranked
list (design §13, Phase 1). Needs ANTHROPIC_API_KEY.`;

async function doctor(opts: JobOptions): Promise<void> {
  const cfg = await loadConfig(opts.configDir ?? "config");
  console.log(
    `config ok: ${cfg.topics.length} topics, ${cfg.sources.length} source(s), ` +
      `${cfg.queries.length} query set(s)`,
  );
  for (
    const key of [
      "ANTHROPIC_API_KEY",
      "GOOGLE_CLOUD_PROJECT", // Vertex embeddings + Gemini grounding search
      "VERTEX_LOCATION",
      "GITHUB_TOKEN",
    ]
  ) {
    console.log(`${key}: ${Deno.env.get(key) ? "set" : "MISSING"}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: [
      "dry-run",
      "no-embed",
      "no-fetch",
      "no-search",
      "no-citations",
      "no-entities",
      "json",
      "pr",
      "help",
    ],
    string: ["config", "archive", "since-days", "limit", "out", "track-min"],
    alias: { h: "help" },
  });
  const cmd = String(args._[0] ?? "");
  if (args.help || !cmd) {
    console.log(HELP);
    return;
  }

  const opts: JobOptions = {
    configDir: args.config,
    archiveDir: args.archive,
    dryRun: args["dry-run"],
    noEmbed: args["no-embed"],
    noFetch: args["no-fetch"],
    noSearch: args["no-search"],
    noCitations: args["no-citations"],
  };

  switch (cmd) {
    case "harvest":
      await harvest(opts);
      break;
    case "digest":
      await digest({
        ...opts,
        sinceDays: args["since-days"] ? Number(args["since-days"]) : undefined,
        limit: args.limit ? Number(args.limit) : undefined,
        json: args.json,
      });
      break;
    case "assemble":
      await assemble({
        ...opts,
        sinceDays: args["since-days"] ? Number(args["since-days"]) : undefined,
        limit: args.limit ? Number(args.limit) : undefined,
        pr: args.pr,
        noEntities: args["no-entities"],
      });
      break;
    case "doctor":
      await doctor(opts);
      break;
    case "rebuild-index": {
      const { openIndex, rebuildIndex } = await import("../src/store/index.ts");
      const dir = opts.archiveDir ?? "archive";
      const counts = await rebuildIndex(openIndex(`file:${dir}/index.db`), dir);
      console.log(
        `rebuild-index: ${counts.records} records (${counts.vectors} with vectors) -> ${dir}/index.db`,
      );
      break;
    }
    case "backfill":
      await backfill(opts);
      break;
    case "entities":
      await entities({
        ...opts,
        out: args.out,
        trackMin: args["track-min"] ? Number(args["track-min"]) : undefined,
      });
      break;
    default:
      console.error(`unknown command: ${cmd}`);
      console.log(HELP);
      Deno.exit(1);
  }
}

if (import.meta.main) await main();
