// Entity-graph queries — salience over the edge set (design §7.3, §7.5).
// Salience (an entity spiking in recent items) both gates the `tracked` flag and
// feeds selection + topic recommendations.
import type { Edge } from "../types.ts";

const DAY = 86_400_000;

export interface Salience {
  /** Distinct items linked to the entity in the last 30 days. */
  items30d: number;
  /** Distinct items linked to the entity, all time. */
  itemsTotal: number;
  /** Last-30-days vs the prior 30 days. */
  trend: "rising" | "flat" | "falling";
}

/**
 * Per-entity salience from edges plus each record's date. `recordDate` maps a
 * record id → an ISO date (the record's firstSeen or publishedAt); edges whose
 * record has no date still count toward the total but not the windows.
 */
export function salience(
  edges: Edge[],
  recordDate: Map<string, string>,
  nowIso: string,
): Map<string, Salience> {
  const now = Date.parse(nowIso);
  const acc = new Map<
    string,
    { recent: number; prior: number; total: number; items: Set<string> }
  >();

  for (const e of edges) {
    let a = acc.get(e.to);
    if (!a) {
      a = { recent: 0, prior: 0, total: 0, items: new Set() };
      acc.set(e.to, a);
    }
    if (a.items.has(e.from)) continue; // one record counts once per entity
    a.items.add(e.from);
    a.total++;
    const iso = recordDate.get(e.from);
    if (iso) {
      const age = now - Date.parse(iso);
      if (age <= 30 * DAY) a.recent++;
      else if (age <= 60 * DAY) a.prior++;
    }
  }

  const out = new Map<string, Salience>();
  for (const [id, a] of acc) {
    const trend = a.recent > a.prior ? "rising" : a.recent < a.prior ? "falling" : "flat";
    out.set(id, { items30d: a.recent, itemsTotal: a.total, trend });
  }
  return out;
}
