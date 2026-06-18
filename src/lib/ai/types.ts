/**
 * Ask Ultrametrics — shared AI types (Phase 1).
 *
 * SDK-agnostic contracts shared across the AI layer. Only anthropic.ts imports
 * the Anthropic SDK; everything else (router, prompt, tools, route, hook) speaks
 * these types. Conversation history at the API boundary is plain text turns —
 * the richer tool_use/tool_result message shapes are an internal concern of the
 * streaming loop in anthropic.ts.
 */

import type { MetricsProvider } from "@/lib/metrics/types";

/** The two models Phase 1 routes between. */
export type AiModel = "claude-sonnet-4-6" | "claude-opus-4-8";

/** Thinking configuration as the router expresses it (translated to SDK params). */
export type ThinkingConfig =
  | { type: "disabled" }
  | { type: "adaptive"; display: "summarized" };

/** Effort level for output_config. */
export type AiEffort = "low" | "medium" | "high";

/** A plain conversation turn exchanged with the client. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Server-resolved workspace context. workspaceId is ALWAYS derived server-side
 * (never from the client/model) and is the scoping anchor for every tool call.
 */
export interface WorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  /** Providers with an active connector in this workspace. */
  connectedProviders: MetricsProvider[];
  /** ISO date (YYYY-MM-DD) injected once, appended LAST in the system prompt. */
  todayISO: string;
}

/** Inputs the router uses to choose a model. Pure data, no I/O. */
export interface RouterSignals {
  userMessage: string;
  approxInputTokens: number;
  toolRoundsSoFar: number;
  /** Sticky escalation: once true, the conversation stays on Opus. */
  stickyEscalated: boolean;
  /** Plan gate — when false, escalation is suppressed (stay on Sonnet). */
  opusAllowed: boolean;
  /** Admin/testing override. */
  explicitModel?: AiModel;
}

/** The router's decision for one turn. */
export interface RouteDecision {
  model: AiModel;
  thinking: ThinkingConfig;
  effort: AiEffort;
  /** True if this turn is (or remains, when sticky) on Opus. Round-tripped. */
  escalated: boolean;
  /** Human-readable rationale, logged for cost telemetry. */
  reason: string;
}

/** Normalized stream events emitted by streamWorkspaceChat. */
export type ChatStreamEvent =
  | { type: "model"; model: AiModel; reason: string }
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string }
  | {
      type: "done";
      model: AiModel;
      escalated: boolean;
      stopReason: string | null;
      toolRounds: number;
      usage: { inputTokens: number; outputTokens: number };
    }
  | { type: "error"; message: string };

/** Everything one streamed turn needs. */
export interface ChatTurnInput {
  ctx: WorkspaceContext;
  messages: ChatMessage[];
  signals: RouterSignals;
}
