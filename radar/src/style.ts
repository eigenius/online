// House style guide loading. The writing stages (summarize, select, recommend)
// fold this into their system prompts so the newsletter matches the Eigenius
// voice. The short guide (docs/guides/eigenius-perspective-short.md) is the
// drafting companion — small enough to sit in a cached system block.

const DEFAULT_STYLE_PATH = "../docs/guides/eigenius-perspective-short.md";

export async function loadStyleGuide(path = DEFAULT_STYLE_PATH): Promise<string> {
  try {
    return (await Deno.readTextFile(path)).trim();
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return ""; // no guide → no-op
    throw err;
  }
}

/** Prepend the style guide to a task system prompt (no-op if the guide is empty). */
export function withStyle(style: string, task: string): string {
  if (!style) return task;
  return "Write in the house voice described in the STYLE GUIDE below.\n\n" +
    `=== STYLE GUIDE ===\n${style}\n=== END STYLE GUIDE ===\n\n${task}`;
}
