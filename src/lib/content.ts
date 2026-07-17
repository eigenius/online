import { getCollection, type CollectionEntry } from "astro:content";
import { withBase } from "./url";

export type SectionName = "newsletter" | "articles" | "blog";
export type Issue = CollectionEntry<"newsletter">;
export type Entry = CollectionEntry<SectionName>;

/** Where an entry of each collection is served. */
export function entryUrl(section: SectionName, entry: Entry): string {
  return withBase(`/${section}/${entry.id}/`);
}

/**
 * Published entries of one section, newest first.
 *
 * Drafts are excluded from production builds only, so `npm run dev`
 * still renders them. GitHub Pages serves a static build, so there is
 * no request-time gate — a draft that reaches `dist/` is public.
 *
 * The index pages, the entry pages, and the RSS feeds all read
 * through this function. If they each filtered and sorted
 * independently, a draft could disappear from an index while
 * remaining reachable at its URL and in the feed.
 */
export async function getPublished<C extends SectionName>(
  section: C,
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(section, ({ data }) =>
    import.meta.env.PROD ? data.draft === false : true,
  );
  return entries.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/**
 * Published newsletter issues, highest issue number first.
 *
 * Ordered by `issue` rather than `pubDate`: the issue number is the
 * archive's authoritative sequence, and a back-dated correction to a
 * pubDate must not reshuffle it.
 */
export async function getIssues(): Promise<Issue[]> {
  const issues = await getPublished("newsletter");
  assertDistinctIssueNumbers(issues);
  return issues.sort((a, b) => b.data.issue - a.data.issue);
}

/** An issue's neighbours in the numbered sequence. */
export interface IssueContext {
  prev?: Issue;
  next?: Issue;
}

export async function getIssueContext(issue: Issue): Promise<IssueContext> {
  // getIssues() is newest-first; ascending is easier to think in here.
  const ascending = (await getIssues()).reverse();
  const index = ascending.findIndex((i) => i.id === issue.id);
  return {
    prev: index > 0 ? ascending[index - 1] : undefined,
    next: index < ascending.length - 1 ? ascending[index + 1] : undefined,
  };
}

/**
 * Two issues claiming the same number have no defined order, and
 * whichever the sort happens to emit first would silently become the
 * earlier issue. Fail the build instead.
 */
function assertDistinctIssueNumbers(issues: Issue[]): void {
  const seen = new Map<number, string>();
  for (const issue of issues) {
    const clash = seen.get(issue.data.issue);
    if (clash) {
      throw new Error(
        `Two newsletter issues are both numbered ${issue.data.issue}: ` +
          `"${clash}" and "${issue.id}". Issue numbers must be unique.`,
      );
    }
    seen.set(issue.data.issue, issue.id);
  }
}

/** `2026-07-17` → `17 July 2026`. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Machine-readable form for `<time datetime>`, e.g. `2026-07-17`. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
