/**
 * Validate generated content against the site's content-collection schema
 * (design §5, §9). Because the pipeline shares a language with the site, the
 * intended implementation imports the site's Zod schema directly:
 *
 *   import { collections } from "../../../src/content.config.ts";
 *
 * and runs the `newsletter` collection schema over the parsed frontmatter
 * before opening the PR. Stub for now — CI can also run `astro check`.
 */
export function validateIssueFrontmatter(_frontmatter: unknown): void {
  // TODO: import and apply the site's `newsletter` collection schema.
}
