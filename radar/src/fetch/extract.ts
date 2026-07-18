// Main-content extraction for generic HTML pages (design §6.1). Used to turn a
// blog/news article into plain text for the summarizer when the feed only gave
// a short excerpt. A dependency-light heuristic over deno-dom: strip
// non-content elements, then take the best content container's text. (Mozilla
// Readability is the quality upgrade if this proves too blunt on some sites.)
import { DOMParser } from "@b-fuze/deno-dom";

const STRIP = [
  "script",
  "style",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "noscript",
  "iframe",
  "svg",
];

export function extractMainText(html: string, _url: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return "";

  for (const sel of STRIP) {
    for (const el of doc.querySelectorAll(sel)) el.remove();
  }

  const main = doc.querySelector("article") ??
    doc.querySelector("main") ??
    doc.querySelector('[role="main"]') ??
    doc.body;

  return (main?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The page's title, from og:title (usually cleaner) or the <title> tag, with a
 * trailing " — Site Name" / " | Site Name" suffix trimmed off. Used to replace
 * weak titles (e.g. a bare domain from grounding) with the real headline.
 */
export function extractTitle(html: string): string | undefined {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return undefined;
  const og = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
  const raw = (og ?? doc.querySelector("title")?.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return undefined;
  const trimmed = raw.replace(/\s*[|–—·-]\s*[^|–—·-]{1,40}$/, "").trim();
  return trimmed.length >= 10 ? trimmed : raw; // don't strip down to almost nothing
}

/** A title that carries no real information — empty, or a bare domain/URL. */
export function isWeakTitle(title: string | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (!t.includes(" ") && /\.[a-z]{2,}(\/|$)/i.test(t)) return true; // looks like a domain/URL
  return t.length < 8;
}
