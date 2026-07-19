// Entity extraction from a record (design §7.2). v1 is deterministic over the
// record's own metadata — no LLM, no external lookups — which covers three of
// the four kinds cheaply and safely:
//   person   ← each author            (authored_by)
//   source   ← the publication domain (published_on)
//   research ← each matched topic area (about)
// Organizations (and notable individual works) need affiliations / an LLM pass
// over the snapshot; that's the documented next step (§7.1, §7.2) and slots in
// here without changing callers.
import type { ArchiveRecord, Edge, Entity } from "../types.ts";

/** Registrable-ish domain: hostname minus a leading "www.". */
export function sourceHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/** A URL path segment for an entity id, unique within its kind (the kind is
 *  already in the route, e.g. /people/<slug>/). */
export function entitySlug(id: string): string {
  const tail = id.replace(
    /^(person:name:|person:|organization:|org:|source:|research:|topic:)/,
    "",
  );
  return tail.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

/** A url/id-safe slug for a display name. */
export function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractEntities(rec: ArchiveRecord): { entities: Entity[]; edges: Edge[] } {
  const entities: Entity[] = [];
  const edges: Edge[] = [];

  for (const name of rec.authors) {
    const s = slug(name);
    if (!s) continue;
    const id = `person:name:${s}`;
    entities.push({
      id,
      kind: "person",
      displayName: name.trim(),
      canonical: { type: "name", value: s },
      aliases: [name.trim()],
      links: {},
      tracked: false,
    });
    edges.push({ from: rec.id, rel: "authored_by", to: id });
  }

  const host = sourceHost(rec.url);
  if (host) {
    const id = `source:${host}`;
    entities.push({
      id,
      kind: "source",
      displayName: host,
      canonical: { type: "domain", value: host },
      aliases: [],
      links: { homepage: `https://${host}` },
      tracked: false,
    });
    edges.push({ from: rec.id, rel: "published_on", to: id });
  }

  for (const topic of rec.topics) {
    const id = `research:${topic}`;
    entities.push({
      id,
      kind: "research",
      displayName: topic,
      canonical: { type: "topic", value: topic },
      aliases: [],
      links: {},
      tracked: false,
    });
    edges.push({ from: rec.id, rel: "about", to: id });
  }

  return { entities, edges };
}
