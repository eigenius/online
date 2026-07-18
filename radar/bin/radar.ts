// CLI entrypoint. The GitHub Actions workflows call these subcommands.
import { parseArgs } from "@std/cli/parse-args";
import { loadConfig } from "../src/config.ts";
import { harvest, type JobOptions } from "../src/jobs/harvest.ts";
import { digest } from "../src/jobs/digest.ts";
import { assemble } from "../src/jobs/assemble.ts";

const HELP = `radar — research-radar & newsletter pipeline

Usage:
  radar harvest   [--config <dir>] [--archive <dir>] [--dry-run] [--no-embed] [--no-fetch]
  radar digest    [--config <dir>] [--archive <dir>] [--since-days N] [--limit N] [--json]
  radar assemble  [--config <dir>] [--archive <dir>] [--since-days N] [--limit N] [--dry-run] [--pr]
  radar doctor    [--config <dir>]     validate config + report environment
  radar backfill                       (not yet implemented)
  radar rebuild-index                  (not yet implemented)

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
      "GOOGLE_CLOUD_PROJECT",
      "GOOGLE_PSE_API_KEY",
      "GOOGLE_PSE_CX",
      "GITHUB_TOKEN",
    ]
  ) {
    console.log(`${key}: ${Deno.env.get(key) ? "set" : "MISSING"}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: ["dry-run", "no-embed", "no-fetch", "json", "pr", "help"],
    string: ["config", "archive", "since-days", "limit"],
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
      });
      break;
    case "doctor":
      await doctor(opts);
      break;
    case "backfill":
    case "rebuild-index":
      console.error(`${cmd}: not yet implemented`);
      Deno.exit(1);
      break;
    default:
      console.error(`unknown command: ${cmd}`);
      console.log(HELP);
      Deno.exit(1);
  }
}

if (import.meta.main) await main();
