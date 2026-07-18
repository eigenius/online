// Append-only JSONL record log — archive tier 1, the source of truth (§6.2).
import { ensureDir } from "@std/fs";
import { dirname, join } from "@std/path";
import type { ArchiveRecord } from "../types.ts";

export class RecordStore {
  constructor(private root: string) {}

  /** Records are bucketed by first-seen month: records/YYYY-MM.jsonl. */
  private fileFor(iso: string): string {
    return join(this.root, "records", `${iso.slice(0, 7)}.jsonl`);
  }

  async append(rec: ArchiveRecord): Promise<void> {
    const file = this.fileFor(rec.firstSeen);
    await ensureDir(dirname(file));
    await Deno.writeTextFile(file, JSON.stringify(rec) + "\n", { append: true });
  }

  async *all(): AsyncIterable<ArchiveRecord> {
    const dir = join(this.root, "records");
    // Deno.readDir throws NotFound lazily during iteration, so collect the
    // filenames under a try/catch and treat a missing dir as an empty archive.
    const names: string[] = [];
    try {
      for await (const e of Deno.readDir(dir)) {
        if (e.isFile && e.name.endsWith(".jsonl")) names.push(e.name);
      }
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return; // no archive yet
      throw err;
    }
    for (const name of names) {
      const text = await Deno.readTextFile(join(dir, name));
      for (const line of text.split("\n")) {
        if (line.trim()) yield JSON.parse(line) as ArchiveRecord;
      }
    }
  }

  /**
   * Records first seen at or after `sinceIso` — the "new this week" query
   * (design §6.4). ISO-8601 timestamps compare correctly as strings. A Phase-0
   * JSONL scan; the libSQL index (§6.2 tier 4) makes this an indexed lookup.
   */
  async newSince(sinceIso: string): Promise<ArchiveRecord[]> {
    const out: ArchiveRecord[] = [];
    for await (const r of this.all()) {
      if (r.firstSeen >= sinceIso) out.push(r);
    }
    return out;
  }

  /** The set of record ids already in the archive — used for idempotent dedup. */
  async existingIds(): Promise<Set<string>> {
    const ids = new Set<string>();
    for await (const r of this.all()) ids.add(r.id);
    return ids;
  }
}
