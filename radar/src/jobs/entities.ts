// Build the entity index (design §7): scan the archive, extract person / source /
// research entities and their edges from each record, resolve, score salience,
// apply the `tracked` gate, and write the reviewed JSON extract the site renders
// into /people, /organizations, /sources, /research. The whole thing is derived
// from the archive and fully rebuildable — rerun any time.
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";
import { loadConfig } from "../config.ts";
import { RecordStore } from "../store/records.ts";
import { entitySlug, extractEntities } from "../entities/extract.ts";
import { resolveEntities } from "../entities/resolve.ts";
import { salience } from "../entities/graph.ts";
import { type EntityPage, type ItemRef, renderEntityData } from "../render/entities.ts";
import type { Edge, Entity, EntityKind } from "../types.ts";
import type { JobOptions } from "./harvest.ts";

/** Min items for a public page, per kind. People/orgs are held to a higher bar —
 *  publishing pages about people carries real obligations (§7.6), and the whole
 *  extract still passes through the weekly PR for editor approval. */
const TRACK_MIN: Record<EntityKind, number> = {
  person: 3,
  organization: 3,
  source: 2,
  research: 2,
};
/** Cap the sourced item list per entity page. */
const MAX_ITEMS = 50;
/** Cap the related-entity neighbourhood per page. */
const MAX_RELATED = 24;

export interface EntitiesOptions extends JobOptions {
  /** Where to write the JSON extract. Default ../src/data/entities.json. */
  out?: string;
  /** Override the min-items track threshold for all kinds. */
  trackMin?: number;
}

export async function entities(opts: EntitiesOptions = {}): Promise<void> {
  const archiveDir = opts.archiveDir ?? "archive";
  const cfg = await loadConfig(opts.configDir ?? "config");
  const topicLabel = new Map(cfg.topics.map((t) => [t.key, t.label]));
  const now = new Date().toISOString();

  const recordMeta = new Map<string, ItemRef>();
  const recordDate = new Map<string, string>();
  const allEntities: Entity[] = [];
  const allEdges: Edge[] = [];

  for await (const rec of new RecordStore(archiveDir).all()) {
    recordMeta.set(rec.id, {
      id: rec.id,
      title: rec.title,
      url: rec.url,
      firstSeen: rec.firstSeen,
      sourceKind: rec.sourceKind,
    });
    recordDate.set(rec.id, rec.publishedAt ?? rec.firstSeen);
    const { entities: es, edges } = extractEntities(rec);
    allEntities.push(...es);
    allEdges.push(...edges);
  }

  const resolved = resolveEntities(allEntities);
  // Prettify research areas to their topic labels once, so pages and related
  // links both show the label.
  for (const e of resolved) {
    if (e.kind === "research") e.displayName = topicLabel.get(e.displayName) ?? e.displayName;
  }
  const entityById = new Map(resolved.map((e) => [e.id, e]));
  const sal = salience(allEdges, recordDate, now);

  // Edge indexes: entity → its records, record → its entities (for related).
  const recordsOf = new Map<string, Set<string>>();
  const entitiesOf = new Map<string, Set<string>>();
  const addTo = (m: Map<string, Set<string>>, k: string, v: string) => {
    const s = m.get(k) ?? new Set<string>();
    s.add(v);
    m.set(k, s);
  };
  for (const e of allEdges) {
    addTo(recordsOf, e.to, e.from);
    addTo(entitiesOf, e.from, e.to);
  }

  const pages: EntityPage[] = resolved.map((e) => {
    const recIds = [...(recordsOf.get(e.id) ?? [])];
    const items = recIds
      .map((id) => recordMeta.get(id))
      .filter((m): m is ItemRef => !!m)
      .sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1)) // newest first
      .slice(0, MAX_ITEMS);

    const relatedIds = new Set<string>();
    for (const rid of recIds) {
      for (const other of entitiesOf.get(rid) ?? []) if (other !== e.id) relatedIds.add(other);
    }
    const related = [...relatedIds]
      .map((id) => entityById.get(id))
      .filter((x): x is Entity => !!x)
      .map((x) => ({ id: x.id, kind: x.kind, displayName: x.displayName }))
      .slice(0, MAX_RELATED);

    const s = sal.get(e.id) ?? { items30d: 0, itemsTotal: recIds.length, trend: "flat" as const };
    const trackMin = opts.trackMin ?? TRACK_MIN[e.kind];
    return {
      id: e.id,
      slug: entitySlug(e.id),
      kind: e.kind,
      displayName: e.displayName,
      aliases: e.aliases,
      links: e.links,
      tracked: s.itemsTotal >= trackMin,
      salience: s,
      items,
      related,
    };
  });

  const tracked = pages.filter((p) => p.tracked).length;
  if (opts.dryRun) {
    console.log(
      `entities: ${resolved.length} resolved, ${tracked} tracked (dry run — not written)`,
    );
    return;
  }
  const out = opts.out ?? "../src/data/entities.json";
  await ensureDir(dirname(out));
  await Deno.writeTextFile(out, renderEntityData(pages, now) + "\n");
  console.log(`entities: ${resolved.length} resolved, ${tracked} tracked -> ${out}`);
}
