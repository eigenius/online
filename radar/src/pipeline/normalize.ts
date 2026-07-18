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

export function canonicalOf(c: Candidate): Canonical {
  return c.canonicalHint ?? { type: "url", value: canonicalUrl(c.url) };
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
