// @ts-check
import { defineConfig } from "astro/config";

// The community site for the Eigenius project: a weekly newsletter
// archive, articles, and blog posts. Branding (logo, palette, page
// chrome) is adapted from the main site at eigenius.io, which lives
// in the eigenius/eigenius repo under website/.
//
// Unlike the main site there is no docs tree here, so no Starlight —
// every page is hand-authored against the shared chrome in
// src/layouts/ and src/components/.
//
// Deployed to GitHub Pages as a *project* site, so it serves under
// the /online/ base path. Every internal link must go through
// withBase() (src/lib/url.ts) to survive that prefix. To move to a
// custom domain later (e.g. online.eigenius.io):
//   1. set `site` to the domain and delete `base`,
//   2. add a public/CNAME file with the bare domain,
//   3. point a DNS CNAME record at eigenius.github.io.
// withBase() collapses to a no-op when `base` is unset, so links
// need no changes.
export default defineConfig({
  site: "https://eigenius.github.io",
  base: "/online",
});
