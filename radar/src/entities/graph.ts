import type { Edge } from "../types.ts";

/**
 * Entity-graph queries — salience and neighbours (design §7.3, §7.5). Salience
 * (an entity spiking in recent items) feeds selection and topic recommendations.
 * Stub — Phase 5.
 */
export function salience(_edges: Edge[]): Map<string, number> {
  return new Map();
}
