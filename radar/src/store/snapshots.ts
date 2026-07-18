// Content-addressed text snapshots — archive tier 2 (§6.2). The exact text a
// summary was checked against, preserved for audit and re-use.
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { encodeHex } from "@std/encoding/hex";

export class SnapshotStore {
  constructor(private root: string) {}

  private async key(url: string, fetchedAt: string): Promise<string> {
    const data = new TextEncoder().encode(`${url}\n${fetchedAt}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return encodeHex(new Uint8Array(digest));
  }

  /** Store extracted plain text; returns the content-address key. */
  async put(url: string, fetchedAt: string, text: string): Promise<string> {
    const k = await this.key(url, fetchedAt);
    const dir = join(this.root, "snapshots");
    await ensureDir(dir);
    await Deno.writeTextFile(join(dir, `${k}.txt`), text);
    return k;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await Deno.readTextFile(join(this.root, "snapshots", `${key}.txt`));
    } catch {
      return null;
    }
  }
}
