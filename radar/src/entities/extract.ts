import type { ArchiveRecord, Edge, Entity } from "../types.ts";

/**
 * Extract entities and typed edges from a record (design §7.2): authoritative
 * metadata first (authors, affiliations, source domain, DOI), then an LLM
 * structured-output pass for entities not in the metadata. Stub — Phase 5.
 */
export function extractEntities(_rec: ArchiveRecord): { entities: Entity[]; edges: Edge[] } {
  return { entities: [], edges: [] };
}
