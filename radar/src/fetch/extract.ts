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
