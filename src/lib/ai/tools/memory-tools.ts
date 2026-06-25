/**
 * Ask Ultrametrics — workspace-memory tool (Sprint 31).
 *
 * The ONLY write tool in the catalog, and it is tightly scoped: it persists a
 * durable workspace NOTE (preference/context) when the user explicitly asks the
 * assistant to remember something. It never touches marketing data, connectors,
 * budgets, or campaigns — the assistant stays read-only for all of those.
 *
 * Notes are read back into the system prompt on subsequent turns (grounding/
 * voice), but the no-fabrication contract is unchanged: numbers still come only
 * from the metrics tools.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { WorkspaceContext } from "@/lib/ai/types";
import { createMemory, MEMORY_MAX_LEN } from "@/lib/data/workspace-memory";

export const rememberToolDefinition: Anthropic.Tool = {
  name: "remember_fact",
  description:
    "Save a durable workspace note the user explicitly asks you to remember — a preference, goal, or rule (e.g. \"target ROAS is 3.0\", \"never pause brand campaigns\", \"report in GBP\"). Use ONLY when the user clearly asks you to remember/save/note something. Do NOT store metric values, campaign data, or anything you inferred — notes are user-stated context, not measurements.",
  input_schema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "The note to remember, as a short self-contained sentence in the user's terms.",
      },
    },
    required: ["content"],
  },
};

/** Persist a memory note for the active workspace + actor. Returns JSON. */
export async function rememberToolHandler(
  input: Record<string, unknown>,
  ctx: WorkspaceContext
): Promise<string> {
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!content) {
    return JSON.stringify({ status: "error", error: "content is required" });
  }
  const row = await createMemory({
    workspaceId: ctx.workspaceId,
    content: content.slice(0, MEMORY_MAX_LEN),
    source: "ai",
    userId: ctx.userId ?? null,
  });
  if (!row) {
    return JSON.stringify({ status: "error", error: "could not save note" });
  }
  return JSON.stringify({ status: "ok", saved: row.content });
}
