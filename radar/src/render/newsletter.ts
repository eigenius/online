// Render a newsletter issue to Markdown matching the site's `newsletter`
// content collection (design §5). Output frontmatter is exactly what
// src/content.config.ts requires — `draft: true` always.
import { join } from "@std/path";
import type { ArchiveRecord } from "../types.ts";

export interface IssueSection {
  heading: string;
  /** Optional positioning paragraph shown under the section header. */
  context?: string;
  items: ArchiveRecord[];
}

export interface IssueInput {
  issue: number;
  /** YYYY-MM-DD. */
  pubDate: string;
  title: string;
  subtitle?: string;
  description: string;
  intro: string;
  sections: IssueSection[];
}

/** `7`, "welcome" -> "007-welcome.md" (§5 filename convention). */
export function issueFilename(issue: number, slug: string): string {
  return `${String(issue).padStart(3, "0")}-${slug}.md`;
}

/** A title -> a filesystem/URL-safe slug. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "issue";
}

/** Titles of the content already published in a collection dir — used by the
 *  topic recommender to avoid proposing what the site has already covered. */
export async function readTitles(dir: string): Promise<string[]> {
  const titles: string[] = [];
  try {
    for await (const e of Deno.readDir(dir)) {
      if (!e.isFile || !/\.mdx?$/.test(e.name)) continue;
      const text = await Deno.readTextFile(join(dir, e.name));
      const m = text.match(/^title:\s*"?(.+?)"?\s*$/m);
      if (m) titles.push(m[1]);
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
  return titles;
}

/**
 * The next unused issue number, read from the site's newsletter directory (§5).
 * Scans `issue:` in each `.md` frontmatter and returns max + 1 (1 if empty).
 */
export async function nextIssueNumber(newsletterDir: string): Promise<number> {
  let max = 0;
  try {
    for await (const e of Deno.readDir(newsletterDir)) {
      if (!e.isFile || !e.name.endsWith(".md")) continue;
      const text = await Deno.readTextFile(join(newsletterDir, e.name));
      const m = text.match(/^issue:\s*(\d+)/m);
      if (m) max = Math.max(max, Number(m[1]));
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
  return max + 1;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML-safe, single-line text — collapse whitespace so a card stays one
 *  contiguous CommonMark raw-HTML block (no blank lines to break it). */
function inline(s: string): string {
  return esc(s.replace(/\s+/g, " ").trim());
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** `2026-07-12` → `12 Jul 2026`. */
function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function authorLine(authors: string[]): string | null {
  if (authors.length === 0) return null;
  return authors.length <= 3 ? authors.join(", ") : `${authors.slice(0, 3).join(", ")} et al.`;
}

/** "Authors · source.com · 12 Jul 2026", omitting whatever's unavailable. */
function metaLine(r: ArchiveRecord): string {
  return [authorLine(r.authors), hostOf(r.url), fmtDate(r.publishedAt)]
    .filter((x): x is string => !!x)
    .join(" · ");
}

/**
 * One item as a progressive-disclosure card. Emitted as a single contiguous
 * raw-HTML block (no blank lines inside), so Markdown passes it through intact;
 * the site styles `.nl-item`. Collapsed shows the title (linked to the original)
 * + author/source/date; the summary is revealed on expand. The title links out
 * so every item references its source even while collapsed.
 */
function itemCard(r: ArchiveRecord): string {
  const meta = metaLine(r);
  const summary = r.editorial?.summary ?? "";
  const href = esc(r.url);
  return [
    `<details class="nl-item">`,
    `<summary>` +
    `<a class="nl-item-title" href="${href}" target="_blank" rel="noopener">${
      inline(r.title)
    }</a>` +
    (meta ? `<span class="nl-item-meta">${inline(meta)}</span>` : "") +
    `</summary>`,
    `<div class="nl-item-body">`,
    ...(summary ? [`<p>${inline(summary)}</p>`] : []),
    `<p class="nl-item-more"><a href="${href}" target="_blank" rel="noopener">Read the source →</a></p>`,
    `</div>`,
    `</details>`,
  ].join("\n");
}

export function renderIssue(input: IssueInput): string {
  const tags = [
    ...new Set(input.sections.flatMap((s) => s.items).flatMap((r) => r.topics)),
  ];

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(input.title)}`,
    ...(input.subtitle ? [`subtitle: ${JSON.stringify(input.subtitle)}`] : []),
    `description: ${JSON.stringify(input.description)}`,
    `issue: ${input.issue}`,
    `pubDate: ${input.pubDate}`,
    `tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`,
    "draft: true",
    "---",
  ].join("\n");

  const body: string[] = [input.intro];
  for (const section of input.sections) {
    body.push(`\n## ${section.heading}\n`);
    if (section.context) body.push(`<p class="nl-context">${inline(section.context)}</p>`);
    for (const r of section.items) body.push(itemCard(r));
  }

  return `${frontmatter}\n\n${body.join("\n")}\n`;
}
