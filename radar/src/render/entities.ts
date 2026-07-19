// The reviewed data extract the site renders into /people, /organizations,
// /sources, /research (design §7.4). Only `tracked` entities are emitted (§7.6);
// each carries its salience, canonical links, a sourced reverse-chronological
// item list, and its graph neighbours — so every entity page "shows its work."
import type { EntityKind, SourceKind } from "../types.ts";
import type { Salience } from "../entities/graph.ts";

/** One sourced item on an entity page (an edge back to a record). */
export interface ItemRef {
  id: string;
  title: string;
  url: string;
  firstSeen: string;
  sourceKind: SourceKind;
}

/** A neighbouring entity (co-occurs on the same records). */
export interface RelatedRef {
  id: string;
  kind: EntityKind;
  displayName: string;
}

export interface EntityPage {
  id: string;
  /** URL-safe path segment, unique within the kind. */
  slug: string;
  kind: EntityKind;
  displayName: string;
  aliases: string[];
  links: Record<string, string>;
  tracked: boolean;
  salience: Salience;
  items: ItemRef[];
  related: RelatedRef[];
}

export interface EntityExtract {
  generatedAt: string;
  counts: { people: number; organizations: number; sources: number; research: number };
  people: EntityPage[];
  organizations: EntityPage[];
  sources: EntityPage[];
  research: EntityPage[];
}

/** Most-salient first, then most items, then alphabetical. */
function bySalience(a: EntityPage, b: EntityPage): number {
  return b.salience.items30d - a.salience.items30d ||
    b.salience.itemsTotal - a.salience.itemsTotal ||
    a.displayName.localeCompare(b.displayName);
}

export function buildExtract(pages: EntityPage[], generatedAt: string): EntityExtract {
  const people: EntityPage[] = [];
  const organizations: EntityPage[] = [];
  const sources: EntityPage[] = [];
  const research: EntityPage[] = [];
  for (const p of pages) {
    if (!p.tracked) continue; // tracked-only (§7.6)
    (p.kind === "person"
      ? people
      : p.kind === "organization"
      ? organizations
      : p.kind === "source"
      ? sources
      : research).push(p);
  }
  for (const list of [people, organizations, sources, research]) list.sort(bySalience);
  return {
    generatedAt,
    counts: {
      people: people.length,
      organizations: organizations.length,
      sources: sources.length,
      research: research.length,
    },
    people,
    organizations,
    sources,
    research,
  };
}

export function renderEntityData(pages: EntityPage[], generatedAt: string): string {
  return JSON.stringify(buildExtract(pages, generatedAt), null, 2);
}
