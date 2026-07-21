import { defineCollection, z, type SchemaContext } from "astro:content";
import { glob } from "astro/loaders";

// Three dated collections, one per section of the site. They share a
// base schema; the newsletter additionally numbers its issues.
//
// `pubDate` is required on purpose. An undated entry would sort
// arbitrarily and reach the RSS feed with a garbage timestamp;
// requiring it fails the build instead.
//
// The base is a function so it can use the collection `image()` helper:
// that resolves an `image:` path relative to the entry file, fails the
// build if the file is missing, and hands the layout typed metadata that
// <Image> can optimize.
const shared = ({ image }: SchemaContext) => ({
  title: z.string(),
  // Deck line under the headline. Lives here rather than as a heading
  // in the body: the layout already renders `title` as the page's only
  // <h1>, and a second one in the markdown would give the page two.
  subtitle: z.string().optional(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  author: z.string().default("Eigenius"),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  // Optional lead image, path relative to the entry file. Rendered above
  // the body and reused as that page's social card; without it the page
  // falls back to the site-wide card.
  image: image().optional(),
  imageAlt: z.string().optional(),
});

// Weekly issues. `issue` drives the archive order and the previous/
// next navigation between issues — pubDate alone can't, because two
// issues published the same day would have no defined order.
const newsletter = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/newsletter" }),
  schema: (ctx) =>
    z.object({
      ...shared(ctx),
      issue: z.number().int().positive(),
    }),
});

// Longer-form standalone pieces.
const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" }),
  schema: (ctx) => z.object(shared(ctx)),
});

// Shorter, timely posts.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: (ctx) => z.object(shared(ctx)),
});

export const collections = { newsletter, articles, blog };
