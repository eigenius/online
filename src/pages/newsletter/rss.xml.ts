import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getIssues, entryUrl } from "../../lib/content";
import { withBase } from "../../lib/url";

// Newsletter issues only. Kept separate from the combined /rss.xml so
// an RSS-to-email service can later send exactly the weekly issues
// without also mailing every blog post.
//
// Prerendered to a static file at build time — GitHub Pages has no
// server, so this endpoint cannot run on demand.
export async function GET(context: APIContext) {
  const issues = await getIssues();

  return rss({
    title: "Eigenius Community — Newsletter",
    description:
      "The weekly Eigenius newsletter: what landed, what changed, and " +
      "what's next in the project, with highlights from the community.",
    // Non-null: `site` is set in astro.config.mjs, and @astrojs/rss
    // needs an absolute base to resolve each item's link. The base
    // path is folded in so the channel-level <link> points at the
    // site, not the bare domain root.
    site: new URL(withBase("/"), context.site!).href,
    items: issues.map((issue) => ({
      title: `Issue #${issue.data.issue}: ${issue.data.title}`,
      description: issue.data.description,
      pubDate: issue.data.pubDate,
      link: entryUrl("newsletter", issue),
      categories: issue.data.tags,
      author: issue.data.author,
    })),
    customData: "<language>en</language>",
  });
}
