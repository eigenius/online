// Section positioning paragraph (design §8 — reader orientation). Under each
// section header the newsletter shows a short neutral synthesis of the section's
// items: what they share, and how they differ. Descriptive, not editorial — the
// digest stays neutral (house voice lives in the recommendations/commentary).
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "./client.ts";

const SYSTEM =
  "You write a short positioning paragraph for one section of a research newsletter. " +
  "Given the section heading and its items (each a title and summary), write ONE paragraph " +
  "of about four sentences: the first two say what the items have in common — the thread " +
  "that groups them — and the last two say how they differ from one another. Be concrete " +
  "and neutral: describe, don't opine or hype, and introduce no facts beyond the items " +
  "given. Do not repeat the heading or list the titles verbatim.";

export async function sectionContext(
  client: Anthropic,
  heading: string,
  items: { title: string; summary: string }[],
): Promise<string> {
  const block = items
    .map((it, i) => `${i + 1}. ${it.title}\n   ${it.summary}`)
    .join("\n\n");
  const res = await client.messages.create({
    model: MODELS.summarize,
    max_tokens: 400,
    thinking: { type: "disabled" }, // short synthesis — no reasoning budget needed
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: `Section: ${heading}\n\nItems:\n\n${block}` },
    ],
  });
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
