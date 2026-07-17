# Eigenius Community

The community site of the [Eigenius](https://eigenius.io) project: a
weekly newsletter archive, longer-form articles, and blog posts.
Built with [Astro](https://astro.build) and deployed to GitHub Pages
at <https://eigenius.github.io/online/>.

Branding (logo, palette, page chrome) is adapted from the main site,
which lives in the [eigenius/eigenius](https://github.com/eigenius/eigenius)
repo under `website/`.

## Development

```sh
npm install
npm run dev      # dev server at http://localhost:4321/online/
npm run build    # production build into dist/
npm run preview  # serve the production build locally
npm run check    # astro check (types + content schemas)
```

Note the `/online/` prefix: the site is served under a base path (see
below), and the dev server mirrors it.

## Writing content

Content is plain Markdown (or MDX) under `src/content/`, one
directory per section:

| Section | Directory | Served at |
| --- | --- | --- |
| Newsletter issues | `src/content/newsletter/` | `/newsletter/<filename>/` |
| Articles | `src/content/articles/` | `/articles/<filename>/` |
| Blog posts | `src/content/blog/` | `/blog/<filename>/` |

Frontmatter (schemas in `src/content.config.ts`):

```yaml
---
title: "Issue title"
subtitle: "Optional deck line under the headline."
description: "One-or-two-sentence summary; shown on indexes and in RSS."
issue: 2               # newsletter only; must be unique, drives archive order
pubDate: 2026-07-24    # required
updatedDate: 2026-07-25 # optional
author: "Eigenius"     # optional, defaults to Eigenius
tags: ["release"]      # optional
draft: true            # optional; drafts render in dev, never in production
---
```

A weekly issue is one new file in `src/content/newsletter/` with the
next `issue` number — the convention is `NNN-slug.md` (e.g.
`002-first-real-issue.md`). The archive orders by issue number, and
each issue page links to its neighbours automatically. Two issues
with the same number fail the build rather than sorting arbitrarily.

## Feeds

- `/rss.xml` — everything: issues, articles, and posts.
- `/newsletter/rss.xml` — newsletter issues only. Email delivery is
  planned; this feed is shaped so an RSS-to-email service (e.g.
  Buttondown or Mailchimp) can send exactly the weekly issues.

## Deployment

Pushing to `main` builds and deploys via
`.github/workflows/deploy.yml`. One-time repo setup: under
**Settings → Pages**, set the source to **GitHub Actions**.

The site currently deploys as a GitHub Pages *project* site under the
`/online/` base path; all internal links go through `withBase()`
(`src/lib/url.ts`) so they survive the prefix. To move to a custom
domain later (e.g. `online.eigenius.io`):

1. In `astro.config.mjs`, set `site` to the domain and delete `base`.
2. Add a `public/CNAME` file containing the bare domain.
3. Point a DNS CNAME record for the subdomain at `eigenius.github.io`.

No link changes are needed — `withBase()` becomes a no-op when `base`
is unset.
