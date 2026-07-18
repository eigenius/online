// Render a newsletter issue to Markdown matching the site's `newsletter`
// content collection (design §5). Output frontmatter is exactly what
// src/content.config.ts requires — `draft: true` always.
import { join } from "@std/path";
import type { ArchiveRecord } from "../types.ts";

export interface IssueSection {
  heading: string;
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
    for (const r of section.items) {
      body.push(`### ${r.title}`);
      if (r.editorial?.summary) body.push(r.editorial.summary);
      body.push(`[Read the source →](${r.url})\n`);
    }
  }

  return `${frontmatter}\n\n${body.join("\n")}\n`;
}
