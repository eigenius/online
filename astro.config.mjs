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
// Deployed to GitHub Pages under the custom apex domain
// eigenius.online, so the site serves at the root and needs no base
// path. The bare domain is pinned in public/CNAME (copied verbatim
// into dist/ on every build), which is what keeps GitHub Pages from
// resetting the custom-domain setting each deploy.
//
// Internal links still go through withBase() (src/lib/url.ts); with
// no `base` set it collapses to the identity, so the indirection is
// free and the site can move back under a path prefix by adding
// `base` here again without touching any link.
export default defineConfig({
  site: "https://eigenius.online",
});
