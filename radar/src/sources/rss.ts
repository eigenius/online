// Generic RSS/Atom adapter for org, lab, and researcher blogs (design §3, §6.1).
// Handles both RSS 2.0 and Atom, prefers the fullest available body text, and
// strips it to plain text so downstream summarize/embed have real source text.
import { parse } from "@libs/xml";
import { DOMParser } from "@b-fuze/deno-dom";
import type { Candidate, SourceKind } from "../types.ts";
import type { SourceAdapter, Watermark } from "./adapter.ts";
import { httpGet } from "../fetch/http.ts";

export interface RssConfig {
  id: string;
  /** Feed URL (RSS or Atom). */
  url: string;
  sourceKind: SourceKind;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

function field(obj: unknown, key: string): unknown {
  return obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
}

/** Text of a parsed XML node (bare string or `{ "#text": … }`). */
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  const t = field(v, "#text");
  return t == null ? "" : String(t);
}

function htmlToText(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc?.body?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function toIsoDate(s: string): string | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** The canonical link for an item: RSS `<link>url</link>`, or Atom's
 *  `<link rel="alternate" href="…">` (falling back to the first link). */
function linkOf(node: unknown): string {
  const l = field(node, "link");
  const asText = text(l);
  if (asText) return asText; // RSS text form
  let first = "";
  for (const item of asArray(l)) {
    const href = text(field(item, "@href"));
    if (!href) continue;
    const rel = text(field(item, "@rel"));
    if (rel === "alternate" || rel === "") return href;
    if (!first) first = href;
  }
  return first;
}

function authorsOf(node: unknown): string[] {
  const out: string[] = [];
  for (const a of asArray(field(node, "author"))) {
    out.push(text(field(a, "name")) || text(a)); // Atom {name} or RSS text
  }
  for (const c of asArray(field(node, "dc:creator"))) out.push(text(c));
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

function bodyOf(node: unknown): string {
  const raw = text(field(node, "content:encoded")) || // RSS full content
    text(field(node, "content")) || // Atom content
    text(field(node, "summary")) || // Atom summary
    text(field(node, "description")); // RSS description
  return htmlToText(raw).slice(0, 8_000);
}

export function rssAdapter(cfg: RssConfig): SourceAdapter {
  return {
    id: cfg.id,
    async *since(_watermark: Watermark): AsyncIterable<Candidate> {
      const xml = await httpGet(cfg.url);
      const doc = parse(xml);

      const channel = field(field(doc, "rss"), "channel");
      const rssItems = asArray(field(channel, "item"));
      const atomEntries = asArray(field(field(doc, "feed"), "entry"));
      const items = rssItems.length > 0 ? rssItems : atomEntries;

      for (const item of items) {
        const url = linkOf(item);
        if (!url) continue;
        yield {
          source: cfg.id,
          sourceKind: cfg.sourceKind,
          url,
          title: htmlToText(text(field(item, "title"))),
          authors: authorsOf(item),
          publishedAt: toIsoDate(
            text(field(item, "pubDate")) ||
              text(field(item, "published")) ||
              text(field(item, "updated")),
          ),
          abstract: bodyOf(item),
        };
      }
    },
  };
}
