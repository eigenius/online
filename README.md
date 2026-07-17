# Eigenius Community

The community site of the [Eigenius](https://eigenius.io) project: a
weekly newsletter archive, longer-form articles, and blog posts.
Built with [Astro](https://astro.build) and deployed to GitHub Pages
at <https://eigenius.online>.

Branding (logo, palette, page chrome) is adapted from the main site,
which lives in the [eigenius/eigenius](https://github.com/eigenius/eigenius)
repo under `website/`.

## Development

```sh
npm install
npm run dev      # dev server at http://localhost:4321/
npm run build    # production build into dist/
npm run preview  # serve the production build locally
npm run check    # astro check (types + content schemas)
```

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

The site is served at the apex domain **eigenius.online**. The bare
domain is pinned in `public/CNAME`, which Astro copies verbatim into
`dist/` on every build — this is what stops GitHub from clearing the
custom-domain setting on each Actions deploy. Internal links go
through `withBase()` (`src/lib/url.ts`); with no `base` set in
`astro.config.mjs` it's the identity, so re-introducing a path prefix
later needs no link changes.

### Custom domain (eigenius.online via GoDaddy)

DNS records to set in GoDaddy (**My Products → Domain → DNS →
Manage DNS**). Delete GoDaddy's default parked `@` A record first.

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `185.199.108.153` | 600s |
| A | `@` | `185.199.109.153` | 600s |
| A | `@` | `185.199.110.153` | 600s |
| A | `@` | `185.199.111.153` | 600s |
| AAAA | `@` | `2606:50c0:8000::153` | 600s |
| AAAA | `@` | `2606:50c0:8001::153` | 600s |
| AAAA | `@` | `2606:50c0:8002::153` | 600s |
| AAAA | `@` | `2606:50c0:8003::153` | 600s |
| CNAME | `www` | `eigenius.github.io` | 600s |

Then, in the repo's **Settings → Pages → Custom domain**, enter
`eigenius.online`, Save, wait for the DNS check to pass, and tick
**Enforce HTTPS** once the certificate is issued.

Verify propagation:

```sh
dig +short eigenius.online              # → the four 185.199.108–111.153 A records
dig +short www.eigenius.online CNAME    # → eigenius.github.io
```
