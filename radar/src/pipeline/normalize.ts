// Normalize a raw candidate into a canonical archive record (design §4, stage 2).
import { encodeHex } from "@std/encoding/hex";
import type { ArchiveRecord, Candidate, Canonical } from "../types.ts";

/** Strip the fragment from a URL so trivially-different links canonicalize equally. */
export function canonicalUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

/** The arXiv id in a URL (abs/pdf/html, any version), or null. */
export function arxivId(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.hostname.replace(/^www\./, "") !== "arxiv.org") return null;
    const m = url.pathname.match(/^\/(?:abs|pdf|html)\/(.+?)(?:v\d+)?(?:\.pdf)?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** The DOI in a doi.org resolver URL, or null. */
export function doiFromUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (!/^(dx\.)?doi\.org$/.test(url.hostname.replace(/^www\./, ""))) return null;
    const doi = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    return /^10\.\d+\//.test(doi) ? doi : null;
  } catch {
    return null;
  }
}

/**
 * Best canonical identity for a candidate's URL: an arXiv id or DOI when the URL
 * carries one (so the same work found via the feed, web search, or as abs/pdf/
 * html all collapse to one record), else the fragment-stripped URL.
 */
export function canonicalFromUrl(u: string): Canonical {
  const ax = arxivId(u);
  if (ax) return { type: "arxiv", value: ax };
  const doi = doiFromUrl(u);
  if (doi) return { type: "doi", value: doi };
  return { type: "url", value: canonicalUrl(u) };
}

export function canonicalOf(c: Candidate): Canonical {
  return c.canonicalHint ?? canonicalFromUrl(c.url);
}

/** Content-addressed record id from the canonical identity. */
export async function canonicalId(canon: Canonical): Promise<string> {
  const data = new TextEncoder().encode(`${canon.type}:${canon.value}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return "sha256:" + encodeHex(new Uint8Array(digest));
}

export async function normalize(c: Candidate, now: string): Promise<ArchiveRecord> {
  const canonical = canonicalOf(c);
  return {
    id: await canonicalId(canonical),
    canonical,
    title: c.title,
    authors: c.authors,
    sourceKind: c.sourceKind,
    url: c.url,
    publishedAt: c.publishedAt,
    firstSeen: now,
    abstract: c.abstract,
    topics: [],
    sightings: [{ source: c.source, url: c.url, seen: now }],
    signals: {},
  };
}
