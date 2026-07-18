// WEEKLY assembly (design §4, weekly rhythm; §13 Phase 2). Judges the week's
// new entries, ranks them, summarizes the shortlist (Sonnet), lets the editor
// model select and frame the issue (Opus), renders the Markdown, and either
// writes it locally or opens a PR against the site.
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { loadConfig } from "../config.ts";
import { RecordStore } from "../store/records.ts";
import { anthropic, MODELS } from "../agents/client.ts";
import { makeJudge } from "../agents/judge.ts";
import { rank } from "../pipeline/rank.ts";
import { summarize } from "../agents/summarize.ts";
import { type IssuePlan, select } from "../agents/select.ts";
import {
  issueFilename,
  type IssueSection,
  nextIssueNumber,
  renderIssue,
  slugify,
} from "../render/newsletter.ts";
import { type FileChange, openPullRequest } from "../publish/github.ts";
import type { JobOptions } from "./harvest.ts";
import type { ArchiveRecord } from "../types.ts";

export interface AssembleOptions extends JobOptions {
  /** "New" window in days. Default 7. */
  sinceDays?: number;
  /** Cap the number of new records judged (cost control / smoke test). */
  limit?: number;
  /** Candidates carried into summarize + select. Default 8. */
  shortlist?: number;
  /** Max items in the issue. Default 6. */
  maxItems?: number;
  /** Site newsletter dir (read for the next issue number, written to). */
  newsletterDir?: string;
  /** Print the Markdown and exit — no file, no PR. */
  dryRun?: boolean;
  /** Also open a PR against the site (needs GITHUB_TOKEN). */
  pr?: boolean;
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

export async function assemble(opts: AssembleOptions = {}): Promise<void> {
  const cfg = await loadConfig(opts.configDir ?? "config");
  const store = new RecordStore(opts.archiveDir ?? "archive");
  const newsletterDir = opts.newsletterDir ?? "../src/content/newsletter";
  const sinceDays = opts.sinceDays ?? 7;
  const shortlistN = opts.shortlist ?? 8;
  const maxItems = opts.maxItems ?? 6;
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  let candidates = (await store.newSince(since))
    .sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1));
  if (opts.limit && opts.limit > 0) candidates = candidates.slice(0, opts.limit);
  if (candidates.length === 0) {
    console.log("assemble: no new entries in the window — nothing to draft.");
    return;
  }

  const client = anthropic();

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

  // 2. Summarize (Sonnet) each shortlisted item.
  for (const rec of shortlist) {
    const summary = await summarize(client, rec);
    rec.editorial = { ...rec.editorial, summary, summaryModel: MODELS.summarize };
  }

  // 3. Editorial selection + framing (Opus).
  const plan = await select(client, shortlist, maxItems);
  const byId = new Map(shortlist.map((r) => [r.id, r]));
  const sections = buildSections(plan, byId);
  if (sections.length === 0) {
    console.log("assemble: the editor selected nothing — skipping.");
    return;
  }

  // 4. Render to the site's newsletter schema.
  const issue = await nextIssueNumber(newsletterDir);
  const pubDate = new Date().toISOString().slice(0, 10);
  const slug = slugify(plan.title);
  const markdown = renderIssue({
    issue,
    pubDate,
    title: plan.title,
    description: plan.description,
    intro: plan.intro,
    sections,
  });

  if (opts.dryRun) {
    console.log(markdown);
    return;
  }

  // 5. Write locally (the editor commits it), and optionally open the PR.
  const filename = issueFilename(issue, slug);
  await ensureDir(newsletterDir);
  await Deno.writeTextFile(join(newsletterDir, filename), markdown);
  console.log(`assemble: wrote ${join(newsletterDir, filename)} (issue #${issue}, draft)`);

  if (opts.pr) {
    const change: FileChange = { path: `src/content/newsletter/${filename}`, content: markdown };
    const url = await openPullRequest([change], {
      branch: `radar/issue-${issue}`,
      title: `Newsletter #${issue}: ${plan.title}`,
      body:
        `Draft newsletter issue #${issue}, assembled by radar. Review, set \`draft: false\`, and merge.`,
    });
    console.log(`assemble: opened PR ${url}`);
  }
}
