import type { Entity } from "../types.ts";

/**
 * Produce the reviewed entity-index data extract the site renders into
 * `/people`, `/organizations`, `/sources`, `/research` pages (design §7.4).
 * Only `tracked` entities are emitted (§7.6). Stub — Phase 5.
 */
export function renderEntityData(entities: Entity[]): string {
  const tracked = entities.filter((e) => e.tracked);
  const by = (kind: Entity["kind"]) => tracked.filter((e) => e.kind === kind);
  return JSON.stringify(
    {
      people: by("person"),
      organizations: by("organization"),
      sources: by("source"),
      research: by("research"),
    },
    null,
    2,
  );
}
