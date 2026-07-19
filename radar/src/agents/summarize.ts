// Sonnet summarizer (design §4, stage 8; §8). Writes a tight, factual
// one-paragraph summary from the record's source text. For arXiv the source is
// the abstract; once snapshots land (§6.2 tier 2) this reads the stored
// snapshot instead. Faithfulness verification is a separate Phase-3 pass.
import Anthropic from "@anthropic-ai/sdk";
import type { ArchiveRecord } from "../types.ts";
import { MODELS } from "./client.ts";
import { withStyle } from "../style.ts";

const SYSTEM = "You write summaries for a research newsletter on AI scientists and AI " +
  "engineers, neurosymbolic and hybrid AI, formal methods and verified science, and AI " +
  "in the life sciences. Given a title and its source text, write ONE tight paragraph " +
  "(2-4 sentences) that a busy researcher can skim. State only what the source " +
  "text supports — no speculation, no hype, no invented numbers. Do not repeat " +
  "the title verbatim; lead with what is new or interesting.";

export async function summarize(
  client: Anthropic,
  rec: ArchiveRecord,
  style = "",
): Promise<string> {
  const source = rec.abstract?.trim() || "(no source text available)";
  const res = await client.messages.create({
    model: MODELS.summarize,
    max_tokens: 512,
    thinking: { type: "disabled" }, // short factual task — no reasoning needed
    system: [{
      type: "text",
      text: withStyle(style, SYSTEM),
      cache_control: { type: "ephemeral" },
    }],
    messages: [
      { role: "user", content: `Title: ${rec.title}\n\nSource text:\n${source}` },
    ],
  });
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}
