import type { Entity } from "../types.ts";

/**
 * Resolve/merge entities (design §7.2): canonical id (ORCID/ROR/domain/DOI)
 * first, then name normalization + affiliation/embedding similarity. Ambiguous
 * merges are queued for editor review, never auto-merged. Stub — Phase 5.
 */
export function resolveEntities(entities: Entity[]): Entity[] {
  return entities;
}
