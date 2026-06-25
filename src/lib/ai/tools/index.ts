/**
 * Ask Ultrametrics — tool catalog + dispatch (Phase 1).
 *
 * Single place tools are assembled and invoked. Tools are grouped into
 * CATEGORIES, each carrying a policy (required role, whether it mutates, whether
 * it needs human confirmation). Phase 1 registers ONLY the read category — the
 * advise/act seams are documented but empty, so future recommendation /
 * budget-optimization / campaign tools slot in without touching anthropic.ts,
 * the router, or the grounding tools.
 *
 * dispatchTool is the single execution path; it refuses to run anything outside
 * the registered (read-only) catalog.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { WorkspaceContext } from "@/lib/ai/types";
import {
  metricsToolDefinitions,
  metricsToolHandlers,
  type ReadToolHandler,
} from "@/lib/ai/tools/metrics-tools";
import {
  rememberToolDefinition,
  rememberToolHandler,
} from "@/lib/ai/tools/memory-tools";

/**
 * Tool category. Phase 1 ships "read" only.
 *  - read   : pure metrics reads, member+, no mutation, no confirmation.
 *  - advise : (reserved) recommendations / budget optimization — proposes only.
 *  - act    : (reserved) campaign create/manage — write role + confirmation +
 *             vault token. NOT registered in Phase 1.
 */
export type ToolCategory = "read" | "advise" | "act";

interface RegisteredTool {
  definition: Anthropic.Tool;
  handler: ReadToolHandler;
  category: ToolCategory;
}

/** The active catalog: read-only metrics tools + the scoped memory-write tool
 *  (Sprint 31). `remember_fact` is the only writer and touches ONLY
 *  workspace_memory — never marketing data, connectors, budgets, or campaigns. */
const CATALOG: RegisteredTool[] = [
  ...metricsToolDefinitions.map((definition) => ({
    definition,
    handler: metricsToolHandlers[definition.name],
    category: "read" as const,
  })),
  {
    definition: rememberToolDefinition,
    handler: rememberToolHandler,
    category: "advise" as const,
  },
];

const BY_NAME = new Map<string, RegisteredTool>(
  CATALOG.map((t) => [t.definition.name, t])
);

/** Tool definitions to send to the model. */
export function buildTools(): Anthropic.Tool[] {
  return CATALOG.map((t) => t.definition);
}

/**
 * Execute a tool by name. Returns the serialized result string. Throws for an
 * unknown tool — the model cannot invoke anything outside the catalog, and in
 * Phase 1 the catalog is read-only, so there is no mutation path to reach.
 */
export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  ctx: WorkspaceContext
): Promise<string> {
  const tool = BY_NAME.get(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  // Phase 1 invariant: every registered tool is read-only. (When act/advise
  // land, gate here on tool.category — role check + confirmation for "act".)
  return tool.handler(input, ctx);
}
