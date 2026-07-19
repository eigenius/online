// WEEKLY assembly (design §4, weekly rhythm; §13 Phase 2 + Phase 3). Judges the
// week's new entries, ranks them, summarizes the shortlist (Sonnet), verifies
// each summary against its source and drops any that overreach (adversarial
// faithfulness — the "show your work" guarantee), lets the editor model select
// and frame the issue (Opus), renders the Markdown, generates topic
// recommendations, and either writes locally or opens a PR.
import { ensureDir } from "@std/fs";
import { dirname, join } from "@std/path";
import { loadConfig } from "../config.ts";
import { newCandidates } from "./candidates.ts";
import { buildEntityExtract } from "./entities.ts";
import { anthropic, MODELS } from "../agents/client.ts";
import { makeJudge } from "../agents/judge.ts";
import { rank } from "../pipeline/rank.ts";
import { summarize } from "../agents/summarize.ts";
import { verify } from "../agents/verify.ts";
import { type IssuePlan, select } from "../agents/select.ts";
import { sectionContext } from "../agents/context.ts";
import { recommend } from "../agents/recommend.ts";
import {
  issueFilename,
  type IssueSection,
  nextIssueNumber,
  readTitles,
  renderIssue,
  slugify,
} from "../render/newsletter.ts";
import { type FileChange, openPullRequest } from "../publish/github.ts";
import { loadStyleGuide } from "../style.ts";
import type { JobOptions } from "./harvest.ts";
import type { TopicRecommendation } from "../agents/schemas.ts";
import type { ArchiveRecord } from "../types.ts";

export interface AssembleOptions extends JobOptions {
  /** "New" window in days. Default 7. */
  sinceDays?: number;
  /** Cap the number of new records judged (cost control / smoke test). */
  limit?: number;
  /** Drop items published more than this many days ago. Default 90. */
  maxAgeDays?: number;
  /** Candidates carried into summarize + select. Default 8. */
  shortlist?: number;
  /** Max items in the issue. Default 6. */
  maxItems?: number;
  /** Site content dir (holds newsletter/, articles/, blog/). Default ../src/content. */
  contentDir?: string;
  /** Path to the house style guide. Default docs/guides/eigenius-perspective-short.md. */
  styleGuidePath?: string;
  /** Print the Markdown and exit — no file, no PR. */
  dryRun?: boolean;
  /** Also open a PR against the site (needs GITHUB_TOKEN). */
  pr?: boolean;
  /** Skip refreshing the entity-index extract that rides the same PR (§7.4). */
  noEntities?: boolean;
  /** Skip the per-section positioning paragraphs. */
  noContext?: boolean;
}

/** Group the plan's selections into ordered sections of records. */
function buildSections(plan: IssuePlan, byId: Map<string, ArchiveRecord>): IssueSection[] {
  const order: string[] = [];
  const groups = new Map<string, ArchiveRecord[]>();
  for (const sel of plan.selections) {
    const rec = byId.get(sel.id);
    if (!rec) continue;
    if (!groups.has(sel.section)) {
      groups.set(sel.section, []);
      order.push(sel.section);
    }
    groups.get(sel.section)!.push(rec);
  }
  return order.map((heading) => ({ heading, items: groups.get(heading)! }));
}

/** Render the topic recommendations as a Markdown block (for the PR / stdout). */
function renderRecommendations(recs: TopicRecommendation[]): string {
  if (recs.length === 0) return "";
  const lines = ["## Topic recommendations (for articles/blog)", ""];
  recs.forEach((r, i) => {
    lines.push(`${i + 1}. **${r.topic}**`);
    lines.push(`   ${r.rationale}`);
    if (r.sources.length) lines.push(`   Sources: ${r.sources.join(", ")}`);
    lines.push("");
  });
  return lines.join("\n");
}

export async function assemble(opts: AssembleOptions = {}): Promise<void> {
  const cfg = await loadConfig(opts.configDir ?? "config");
  const archiveDir = opts.archiveDir ?? "archive";
  const contentDir = opts.contentDir ?? "../src/content";
  const newsletterDir = join(contentDir, "newsletter");
  const sinceDays = opts.sinceDays ?? 7;
  const shortlistN = opts.shortlist ?? 8;
  const maxItems = opts.maxItems ?? 6;
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  const { records: deduped, stale, collapsed } = await newCandidates(archiveDir, since, {
    maxAgeDays: opts.maxAgeDays,
  });
  if (stale > 0) console.error(`assemble: dropped ${stale} stale item(s) (published past max-age)`);
  if (collapsed > 0) console.error(`assemble: collapsed ${collapsed} near-duplicate(s)`);
  let candidates = deduped.sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1));
  if (opts.limit && opts.limit > 0) candidates = candidates.slice(0, opts.limit);
  if (candidates.length === 0) {
    console.log("assemble: no new entries in the window — nothing to draft.");
    return;
  }

  const client = anthropic();
  const style = await loadStyleGuide(opts.styleGuidePath);

  // 1. Judge (Haiku) + rank, then take the shortlist.
  const judge = makeJudge(client, cfg.topics);
  for (const rec of candidates) {
    const v = await judge.judge(rec);
    rec.signals = {
      ...rec.signals,
      relevance: v.relevance,
      significance: v.significance,
      judgeModel: MODELS.judge,
      rationale: v.rationale,
    };
  }
  const shortlist = rank(candidates).slice(0, shortlistN).map((r) => r.record);

  // 2. Summarize (Sonnet) then verify (adversarial). Keep only records whose
  //    summary is faithful to its source; one re-summarize retry on failure.
  const verified: ArchiveRecord[] = [];
  for (const rec of shortlist) {
    // Summaries stay strictly faithful to the source (no editorial "one step
    // further" — that lives in the intro + recommendations below); otherwise
    // the faithfulness gate rightly drops interpretive summaries.
    const source = rec.abstract ?? "";
    let summary = await summarize(client, rec);
    let check = await verify(client, summary, source);
    if (!check.supported) {
      summary = await summarize(client, rec);
      check = await verify(client, summary, source);
    }
    if (check.supported) {
      rec.editorial = {
        ...rec.editorial,
        summary,
        summaryModel: MODELS.summarize,
        summaryVerified: true,
      };
      verified.push(rec);
    } else {
      console.error(
        `assemble: dropped "${rec.title}" — summary not supported by source ` +
          `(${check.unsupportedClaims.join("; ")})`,
      );
    }
  }
  if (verified.length === 0) {
    console.log("assemble: no summaries passed the faithfulness check — skipping.");
    return;
  }

  // 3. Editorial selection + framing (Opus). The newsletter is a neutral digest,
  //    so no house style guide here — it's reserved for commentary/articles/blog
  //    (and the recommendations below, which propose exactly those).
  const plan = await select(client, verified, maxItems);
  const byId = new Map(verified.map((r) => [r.id, r]));
  const sections = buildSections(plan, byId);
  if (sections.length === 0) {
    console.log("assemble: the editor selected nothing — skipping.");
    return;
  }

  // 3b. Positioning paragraph per multi-item section — a neutral synthesis of
  //     what the items share and how they differ (Sonnet). A single-item section
  //     needs none.
  if (!opts.noContext) {
    for (const section of sections) {
      if (section.items.length < 2) continue;
      try {
        section.context = await sectionContext(
          client,
          section.heading,
          section.items.map((r) => ({
            title: r.title,
            summary: r.editorial?.summary ?? r.abstract ?? "",
          })),
        );
      } catch (err) {
        console.error(
          `assemble: section context for "${section.heading}" failed: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  // 4. Render to the site's newsletter schema.
  const issue = await nextIssueNumber(newsletterDir);
  const pubDate = new Date().toISOString().slice(0, 10);
  const markdown = renderIssue({
    issue,
    pubDate,
    title: plan.title,
    description: plan.description,
    intro: plan.intro,
    sections,
  });

  // 5. Topic recommendations (Opus), contrasted with what the site already covers.
  const covered = [
    ...await readTitles(join(contentDir, "articles")),
    ...await readTitles(join(contentDir, "blog")),
  ];
  const recs = await recommend(client, verified, covered, style);
  const recMd = renderRecommendations(recs);

  // 5b. Refresh the entity-index extract from the full archive — it rides this
  //     same PR (design §7.4). Independent of the newsletter window.
  const entityExtract = opts.noEntities
    ? null
    : await buildEntityExtract({ archiveDir, configDir: opts.configDir });
  const entitiesRepoPath = "src/data/entities.json";
  const entitiesFile = join(dirname(contentDir), "data", "entities.json");

  if (opts.dryRun) {
    console.log(markdown);
    if (recMd) console.log("\n" + recMd);
    if (entityExtract) {
      console.log(
        `\n[entities] ${entityExtract.resolved} resolved, ${entityExtract.tracked} tracked (dry run)`,
      );
    }
    return;
  }

  // 6. Write the issue locally (the editor commits it), refresh the entity
  //    extract, surface the recommendations, and optionally open the PR.
  const filename = issueFilename(issue, slugify(plan.title));
  await ensureDir(newsletterDir);
  await Deno.writeTextFile(join(newsletterDir, filename), markdown);
  console.log(`assemble: wrote ${join(newsletterDir, filename)} (issue #${issue}, draft)`);
  if (entityExtract) {
    await ensureDir(dirname(entitiesFile));
    await Deno.writeTextFile(entitiesFile, entityExtract.json);
    console.log(`assemble: wrote ${entitiesFile} (${entityExtract.tracked} tracked entities)`);
  }
  if (recMd) console.log("\n" + recMd);

  if (opts.pr) {
    const changes: FileChange[] = [
      { path: `src/content/newsletter/${filename}`, content: markdown },
    ];
    if (entityExtract) changes.push({ path: entitiesRepoPath, content: entityExtract.json });
    const entitiesLine = entityExtract
      ? `\n\nAlso refreshes the entity index (\`${entitiesRepoPath}\`, ${entityExtract.tracked} tracked).`
      : "";
    const url = await openPullRequest(changes, {
      branch: `radar/issue-${issue}`,
      title: `Newsletter #${issue}: ${plan.title}`,
      body: `Draft newsletter issue #${issue}, assembled by radar. Review, set ` +
        `\`draft: false\`, and merge.${entitiesLine}\n\n${recMd}`,
    });
    console.log(`assemble: opened PR ${url}`);
  }
}
