// The entity-index extract produced by the radar pipeline (radar/src/jobs/
// entities.ts) and committed to src/data/entities.json. Only `tracked` entities
// are present. The /people, /organizations, /sources, /research routes render
// from it, mirroring how lib/content.ts fronts the markdown collections.
import entityData from "../data/entities.json";
import { withBase } from "./url";

export type EntityKind = "person" | "organization" | "source" | "research";
export type SourceKind = "paper" | "preprint" | "industry" | "opinion" | "news";
export type Trend = "rising" | "flat" | "falling";
export type Section = "people" | "organizations" | "sources" | "research";

export interface Salience {
  items30d: number;
  itemsTotal: number;
  trend: Trend;
}
export interface ItemRef {
  id: string;
  title: string;
  url: string;
  firstSeen: string;
  sourceKind: SourceKind;
}
export interface RelatedRef {
  id: string;
  kind: EntityKind;
  displayName: string;
}
export interface EntityPage {
  id: string;
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
  counts: Record<Section, number>;
  people: EntityPage[];
  organizations: EntityPage[];
  sources: EntityPage[];
  research: EntityPage[];
}

// JSON is inferred with widened string types; the radar renderer guarantees the
// shape, so assert it here once.
export const entities = entityData as unknown as EntityExtract;

/** URL section for each entity kind. */
export const SECTION: Record<EntityKind, Section> = {
  person: "people",
  organization: "organizations",
  source: "sources",
  research: "research",
};

export const SECTION_LABEL: Record<Section, string> = {
  people: "People",
  organizations: "Organizations",
  sources: "Sources",
  research: "Research",
};

export function pagesFor(section: Section): EntityPage[] {
  return entities[section];
}

const byId = new Map<string, EntityPage>();
for (const section of ["people", "organizations", "sources", "research"] as const) {
  for (const page of entities[section]) byId.set(page.id, page);
}

/** The tracked page for an id, if one exists — related links only resolve to
 *  entities that actually have a page (§7.6, tracked-only). */
export function pageById(id: string): EntityPage | undefined {
  return byId.get(id);
}

export function entityUrl(page: { kind: EntityKind; slug: string }): string {
  return withBase(`/${SECTION[page.kind]}/${page.slug}/`);
}

export function trendLabel(trend: Trend): string {
  return trend === "rising" ? "↑ rising" : trend === "falling" ? "↓ cooling" : "→ steady";
}

/** `2026-07-17T…` → `17 July 2026`. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
