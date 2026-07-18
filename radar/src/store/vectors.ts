// Append-only embedding sidecar — archive tier 3 (§6.2). Vectors are computed
// once and persisted here so an index rebuild never re-calls the paid
// embeddings API (§6.5).
import { ensureDir } from "@std/fs";
import { dirname, join } from "@std/path";
import type { Vector } from "../types.ts";

export interface StoredVector {
  id: string;
  model: string;
  dim: number;
  vec: number[];
}

export class VectorStore {
  constructor(private root: string) {}

  private fileFor(iso: string): string {
    return join(this.root, "vectors", `${iso.slice(0, 7)}.jsonl`);
  }

  async append(id: string, model: string, iso: string, vec: Vector): Promise<void> {
    const file = this.fileFor(iso);
    await ensureDir(dirname(file));
    const row: StoredVector = { id, model, dim: vec.length, vec: Array.from(vec) };
    await Deno.writeTextFile(file, JSON.stringify(row) + "\n", { append: true });
  }

  /** All stored vectors as an id → vector map (last write wins per id). */
  async map(): Promise<Map<string, Vector>> {
    const m = new Map<string, Vector>();
    for await (const v of this.all()) m.set(v.id, new Float32Array(v.vec));
    return m;
  }

  /** Every stored vector, across all month files (for index rebuilds). */
  async *all(): AsyncIterable<StoredVector> {
    const dir = join(this.root, "vectors");
    const names: string[] = [];
    try {
      for await (const e of Deno.readDir(dir)) {
        if (e.isFile && e.name.endsWith(".jsonl")) names.push(e.name);
      }
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return;
      throw err;
    }
    for (const name of names) {
      const text = await Deno.readTextFile(join(dir, name));
      for (const line of text.split("\n")) {
        if (line.trim()) yield JSON.parse(line) as StoredVector;
      }
    }
  }
}
