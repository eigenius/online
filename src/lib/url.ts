/**
 * Prefix a root-relative path with the configured base path.
 *
 * The site deploys to GitHub Pages as a project site, so every page
 * lives under /online/. A literal href="/blog/" would escape that
 * prefix and 404; every internal link must be written through this
 * helper instead. If the site later moves to a custom domain (base
 * unset, BASE_URL === "/"), this collapses to the identity.
 */
const base = import.meta.env.BASE_URL.replace(/\/+$/, "");

export function withBase(path: string): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
