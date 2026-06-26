/**
 * AI Skills Framework — shared types (Sprint 48).
 *
 * A generic, reusable descriptor layer over the existing deterministic engines
 * (Reasoning · Creative · Media Buyer · Marketing Brain). A "skill" is a
 * self-describing, READ-ONLY capability: it declares its identity, permissions,
 * tools, and I/O schema, and runs by delegating to a pure engine. No execution,
 * no I/O, no provider/DB/connector access. Pure data contracts.
 */

import type { Confidence } from "@/lib/ai/reasoning/types";
import type { CreativeInput } from "@/lib/ai/creative/types";
import type { ReasoningInput } from "@/lib/ai/reasoning/types";

export type { Confidence };

/** Functional grouping for a skill. */
export type SkillCategory =
  | "analytics"
  | "creative"
  | "media-buyer"
  | "reporting"
  | "workspace";

/** Coarse read scopes a skill needs. All read-only — no write/execute scopes. */
export type SkillPermission =
  | "read:metrics"
  | "read:memory"
  | "read:creative"
  | "read:reports"
  | "read:workspace";

/** The ONLY supported execution mode in this framework. Nothing executes. */
export type ExecutionMode = "read-only";

/** A single field in a skill's input/output schema (descriptive, not a validator). */
export interface SkillField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
}

/** The self-description every skill exposes. */
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  capabilities: string[];
  permissions: SkillPermission[];
  /** Existing read-only tool names this skill's analysis is grounded in. */
  supportedTools: string[];
  inputSchema: SkillField[];
  outputSchema: SkillField[];
  /** Declared grounding level of the skill (metadata, not a probability). */
  confidence: Confidence;
  executionMode: ExecutionMode;
}

/**
 * The shared grounded input bundle. Each skill reads only the parts it needs
 * and reports `ok: false` (via the runner) when a required part is absent.
 */
export interface SkillInput {
  creativeInput?: CreativeInput;
  reasoningInput?: ReasoningInput;
}

/** What a skill's `run` returns: grounded output + the engine's real confidence. */
export interface SkillRun<O = unknown> {
  output: O | null;
  confidence: Confidence;
  notes?: string;
}

/** The runner's wrapped result. */
export interface SkillResult<O = unknown> {
  skillId: string;
  ok: boolean;
  mode: ExecutionMode;
  output: O | null;
  confidence: Confidence;
  notes?: string;
}
