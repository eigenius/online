// WEEKLY digest (design §13, Phase 1). Selects the week's new archive entries,
// judges each with Haiku, ranks them, and emits a raw ranked list — no prose
// summaries yet (that is Phase 2). This is the "trustworthy what's-new" list the
// editor eyeballs to size real volume and relevance.
import { loadConfig } from "../config.ts";
import { RecordStore } from "../store/records.ts";
import { anthropic, MODELS } from "../agents/client.ts";
import { makeJudge } from "../agents/judge.ts";
import { rank, type RankedRecord } from "../pipeline/rank.ts";
import type { JobOptions } from "./harvest.ts";

export interface DigestOptions extends JobOptions {
  /** Window size in days for "new". Default 7. */
  sinceDays?: number;
  /** Cap the number of records judged (cost control / smoke test). */
  limit?: number;
  /** Emit JSON instead of Markdown. */
  json?: boolean;
}

function topTopic(r: RankedRecord): string {
  const rel = r.record.signals.relevance ?? {};
  let best = "";
  let bestScore = -1;
  for (const [k, v] of Object.entries(rel)) {
    if (v > bestScore) {
      best = k;
      bestScore = v;
    }
  }
  return best;
}

function renderMarkdown(ranked: RankedRecord[], sinceDays: number): string {
  const lines: string[] = [
    `# Weekly digest (raw, unedited) — ${ranked.length} new item(s), last ${sinceDays} day(s)`,
    "",
  ];
  ranked.forEach((r, i) => {
    const sig = (r.record.signals.significance ?? 0).toFixed(2);
    lines.push(
      `${i + 1}. [${r.score.toFixed(2)}] **${r.record.title}** — ` +
        `significance ${sig} · ${topTopic(r)} · <${r.record.url}>`,
    );
    if (r.record.signals.rationale) lines.push(`   ${r.record.signals.rationale}`);
  });
  return lines.join("\n") + "\n";
}

function renderJson(ranked: RankedRecord[]): string {
  return JSON.stringify(
    ranked.map((r) => ({
      score: r.score,
      title: r.record.title,
      url: r.record.url,
      topics: r.record.topics,
      signals: r.record.signals,
    })),
    null,
    2,
  );
}

export async function digest(opts: DigestOptions = {}): Promise<string> {
  const cfg = await loadConfig(opts.configDir ?? "config");
  const store = new RecordStore(opts.archiveDir ?? "archive");
  const sinceDays = opts.sinceDays ?? 7;
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  let records = (await store.newSince(since))
    .sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1)); // newest first
  if (opts.limit && opts.limit > 0) records = records.slice(0, opts.limit);

  const judge = makeJudge(anthropic(), cfg.topics);
  for (const rec of records) {
    const verdict = await judge.judge(rec);
    rec.signals = {
      ...rec.signals,
      relevance: verdict.relevance,
      significance: verdict.significance,
      judgeModel: MODELS.judge,
      rationale: verdict.rationale,
    };
  }

  const ranked = rank(records);
  const out = opts.json ? renderJson(ranked) : renderMarkdown(ranked, sinceDays);
  console.log(out);
  return out;
}
