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
}
