// Opus editorial selection (design §4, stage 9; §8). From the summarized
// shortlist it picks the most interesting items, groups them into sections,
// orders them, and writes the issue title, description, and intro. Structured
// output so the result is a validated plan, not prose to parse.
import Anthropic from "@anthropic-ai/sdk";
import type { ArchiveRecord } from "../types.ts";
import { MODELS } from "./client.ts";
import { withStyle } from "../style.ts";

export interface Selection {
  /** A record id from the shortlist. */
  id: string;
  /** Section heading the editor grouped it under, e.g. "Papers & preprints". */
  section: string;
}

export interface IssuePlan {
  title: string;
  description: string;
  /** Markdown intro paragraph(s). */
  intro: string;
  selections: Selection[];
}

const SYSTEM = "You are the editor of a weekly research newsletter covering neurosymbolic " +
  "techniques, AI Scientists / AI-supported research, formal verification, " +
  "verified science, formal methods in science & engineering, and AI-science " +
  "for life sciences. From the candidate items, select the most interesting " +
  "ones (up to the stated maximum), drop the rest, group the picks into 2-4 " +
  "sections, and order them most-interesting first. Write a short issue title, " +
  "a one-to-two sentence description, and a 2-3 sentence intro. Reference items " +
  "only by the ids provided; do not invent ids.";

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "intro", "selections"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    intro: { type: "string" },
    selections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "section"],
        properties: { id: { type: "string" }, section: { type: "string" } },
      },
    },
  },
};

function candidateBlock(shortlist: ArchiveRecord[]): string {
  return shortlist
    .map((r) =>
      `id: ${r.id}\n` +
      `  title: ${r.title}\n` +
      `  topics: ${r.topics.join(", ")}\n` +
      `  summary: ${r.editorial?.summary ?? r.abstract ?? ""}`
    )
    .join("\n\n");
}

export async function select(
  client: Anthropic,
  shortlist: ArchiveRecord[],
  maxItems = 6,
  style = "",
): Promise<IssuePlan> {
  const res = await client.messages.create({
    model: MODELS.select,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: [{
      type: "text",
      text: withStyle(style, SYSTEM),
      cache_control: { type: "ephemeral" },
    }],
    messages: [
      {
        role: "user",
        content: `Select up to ${maxItems} items for this issue.\n\nCandidates:\n\n` +
          candidateBlock(shortlist),
      },
    ],
  });

  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const plan = JSON.parse(text) as IssuePlan;

  // Keep only selections whose id is a real shortlist member, and cap at maxItems.
  const valid = new Set(shortlist.map((r) => r.id));
  plan.selections = plan.selections.filter((s) => valid.has(s.id)).slice(0, maxItems);
  return plan;
}
