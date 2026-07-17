import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublished, entryUrl, type SectionName } from "../lib/content";
import { withBase } from "../lib/url";

// Everything published on the site — newsletter issues, articles, and
// blog posts — in one reverse-chronological feed. Issue-only
// subscribers should use /newsletter/rss.xml instead.
//
// Prerendered to a static file at build time — GitHub Pages has no
// server, so this endpoint cannot run on demand.
const SECTION_LABEL: Record<SectionName, string> = {
  newsletter: "Newsletter",
  articles: "Article",
  blog: "Blog",
};

export async function GET(context: APIContext) {
  const sections: SectionName[] = ["newsletter", "articles", "blog"];
  const items = (
    await Promise.all(
      sections.map(async (section) =>
        (await getPublished(section)).map((entry) => ({ section, entry })),
      ),
    )
  )
    .flat()
    .sort(
      (a, b) => b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf(),
    );

  return rss({
    title: "Eigenius Community",
    description:
      "Everything from the Eigenius community site: the weekly " +
      "newsletter, articles, and blog posts on typed knowledge graphs " +
      "and auditable AI reasoning.",
    // Non-null: `site` is set in astro.config.mjs, and @astrojs/rss
    // needs an absolute base to resolve each item's link. The base
    // path is folded in so the channel-level <link> points at the
    // site, not the bare domain root.
    site: new URL(withBase("/"), context.site!).href,
    items: items.map(({ section, entry }) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: entryUrl(section, entry),
      // The section rides along as a category so feed readers can
      // filter issues from posts within the combined feed.
      categories: [SECTION_LABEL[section], ...entry.data.tags],
      author: entry.data.author,
    })),
    customData: "<language>en</language>",
  });
}
