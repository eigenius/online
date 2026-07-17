/**
 * Prefix a root-relative path with the configured base path.
 *
 * The site is served at the apex domain eigenius.online, so no `base`
 * is set in astro.config.mjs and BASE_URL is "/" — this helper is
 * currently the identity. It stays in place so every internal link is
 * written the same way: if the site is ever moved back under a path
 * prefix (a GitHub Pages project site, a staging subpath), setting
 * `base` again fixes all links with no edits to any page. A literal
 * href="/blog/" would silently break under such a prefix.
 */
const base = import.meta.env.BASE_URL.replace(/\/+$/, "");

export function withBase(path: string): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
