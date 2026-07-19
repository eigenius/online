// Entity resolution (design §7.2). v1 merges only by canonical id — the id is
// already the resolution key (slugged name, domain, topic), so two records that
// name the same author/domain/topic collapse into one entity with unioned
// aliases and links. This is deliberately conservative: fuzzy person merges
// (name variants, affiliation/embedding similarity) risk mis-attributing one
// person's work to another, so the design queues those for editor review rather
// than auto-merging (§7.2). Different spellings stay separate until an editor
// (or a future resolver) links them via an alias.
import type { Entity } from "../types.ts";

export function resolveEntities(entities: Entity[]): Entity[] {
  const byId = new Map<string, Entity>();
  for (const e of entities) {
    const cur = byId.get(e.id);
    if (!cur) {
      byId.set(e.id, { ...e, aliases: [...new Set(e.aliases)], links: { ...e.links } });
      continue;
    }
    for (const a of e.aliases) if (!cur.aliases.includes(a)) cur.aliases.push(a);
    cur.links = { ...e.links, ...cur.links }; // keep the first-seen link on conflict
    cur.tracked = cur.tracked || e.tracked;
  }
  return [...byId.values()];
}
