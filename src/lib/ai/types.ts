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
import type { ChangeIntent } from "@/lib/ai/change/change-intent";

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
 * Sprint 13B: structured, executable recommendation metadata surfaced from the
 * server's get_recommendations tool result to the client — the ONLY grounded
 * carrier of provider/entity/action (the rendered card is prose and cannot be
 * trusted for these). `actionType` is null unless the kind maps unambiguously to
 * a supported action (never guessed). `params` is reserved (null in 13B).
 */
export interface ActionRecommendation {
  provider: string;
  entityLevel: "account" | "campaign" | "ad";
  entityId: string;
  actionType: "PAUSE_CAMPAIGN" | "RESUME_CAMPAIGN" | "ADJUST_BUDGET" | null;
  /** The server-authored action line (used only as a display title). */
  title: string;
  /** Typed action params (e.g. budget). Always null until a later sprint. */
  params: Record<string, unknown> | null;
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
  /**
   * Sprint 12: detected Change Intelligence intent ("why did ROAS drop", etc.),
   * or null. When present, the turn must route to get_change_analysis — never
   * get_root_cause. Surfaced for telemetry/steering; tool invocation stays
   * model-driven under the system-prompt guard.
   */
  changeIntent: ChangeIntent | null;
}

/** Normalized stream events emitted by streamWorkspaceChat. */
export type ChatStreamEvent =
  | { type: "model"; model: AiModel; reason: string }
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string }
  // Sprint 13B: structured recommendations for this turn (from get_recommendations).
  | { type: "recommendations"; items: ActionRecommendation[] }
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
