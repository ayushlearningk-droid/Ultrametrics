/**
 * Ask Ultrametrics — Anthropic client + streaming tool loop (Phase 1).
 *
 * The ONLY file that imports the Anthropic SDK. Owns the client singleton and
 * streamWorkspaceChat: route a model, build the system prompt + read-only tools,
 * open a streaming request, drive the manual tool loop (handlers bound to the
 * server-resolved workspace), and yield normalized ChatStreamEvents.
 *
 * Model is fixed for the whole turn (no mid-turn swap — that would invalidate
 * the prompt cache). Escalation across turns is the router's job via
 * signals.toolRoundsSoFar / stickyEscalated.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatTurnInput,
  ChatStreamEvent,
  ChatMessage,
} from "@/lib/ai/types";
import { routeModel } from "@/lib/ai/router";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { buildTools, dispatchTool } from "@/lib/ai/tools";
import { parseRecommendationsResult } from "@/lib/ai/structured-actions";

/** Output cap per response. Streaming, so well under SDK HTTP timeout limits. */
const MAX_OUTPUT_TOKENS = 4096;

/** Hard ceiling on tool round-trips within a single turn. */
const MAX_TOOL_ROUNDS = 5;

/** Transient-overload retry policy (overloaded_error / HTTP 529). */
const OVERLOAD_MAX_ATTEMPTS = 3;
/** Delay BEFORE each attempt: attempt 1 immediate, attempt 2 +1s, attempt 3 +2s. */
const OVERLOAD_DELAYS_MS = [0, 1000, 2000];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True for a transient Anthropic overload (retryable pre-generation). */
function isOverloaded(err: unknown): boolean {
  if (!(err instanceof Anthropic.APIError)) return false;
  if (err.status === 529) return true;
  const body = err.error as { error?: { type?: string } } | undefined;
  return body?.error?.type === "overloaded_error";
}

let client: Anthropic | null = null;

/** Lazy singleton. Throws a clear error if the API key is missing. */
export function getAnthropicClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  client = new Anthropic({ apiKey });
  return client;
}

function toMessageParams(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Stream one workspace chat turn. Never throws — failures are emitted as an
 * `error` event. Always ends with a single `done` event carrying accumulated
 * usage so the caller can log usage and release governance slots.
 */
export async function* streamWorkspaceChat(
  input: ChatTurnInput
): AsyncGenerator<ChatStreamEvent> {
  const { ctx, signals } = input;
  const decision = routeModel(signals);

  yield { type: "model", model: decision.model, reason: decision.reason };

  const system = buildSystemPrompt(ctx);
  const tools = buildTools();
  const messages = toMessageParams(input.messages);

  let inputTokens = 0;
  let outputTokens = 0;
  let toolRounds = 0;
  let stopReason: string | null = null;

  try {
    const anthropic = getAnthropicClient();

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // Resilient open: retry transient Anthropic overload (overloaded_error /
      // HTTP 529) up to OVERLOAD_MAX_ATTEMPTS, but ONLY while no text has been
      // streamed this attempt (overload occurs pre-generation, so re-opening
      // can't double-emit). Schedule: attempt 1 immediate, +1000ms, +2000ms.
      let final: Anthropic.Message | undefined;
      for (let attempt = 1; ; attempt++) {
        let textThisAttempt = false;
        try {
          const stream = anthropic.messages.stream({
            model: decision.model,
            max_tokens: MAX_OUTPUT_TOKENS,
            system,
            messages,
            tools,
            thinking: decision.thinking,
            output_config: { effort: decision.effort },
          });

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              textThisAttempt = true;
              yield { type: "text", delta: event.delta.text };
            }
          }

          final = await stream.finalMessage();
          break;
        } catch (err) {
          if (
            isOverloaded(err) &&
            !textThisAttempt &&
            attempt < OVERLOAD_MAX_ATTEMPTS
          ) {
            await delay(OVERLOAD_DELAYS_MS[attempt]);
            continue;
          }
          throw err;
        }
      }
      // The loop only exits via break (final set) or a rethrow.
      if (!final) throw new Error("Model stream produced no final message");
      inputTokens += final.usage.input_tokens;
      outputTokens += final.usage.output_tokens;
      stopReason = final.stop_reason;

      if (final.stop_reason !== "tool_use") {
        break; // end_turn / refusal / max_tokens / stop_sequence — done
      }

      if (round === MAX_TOOL_ROUNDS) {
        stopReason = "tool_rounds_exhausted";
        break;
      }

      // Run each requested tool and feed results back.
      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        yield { type: "tool_call", name: use.name };
        let resultText: string;
        let isError = false;
        try {
          let toolInput = (use.input ?? {}) as Record<string, unknown>;
          // Sprint 12: resolve the change-analysis period DETERMINISTICALLY from
          // the query's date phrasing (router-detected), overriding whatever the
          // model supplied — so "yesterday" → day, never left to model inference.
          if (
            use.name === "get_change_analysis" &&
            decision.changeIntent?.period
          ) {
            toolInput = { ...toolInput, period: decision.changeIntent.period };
          }
          resultText = await dispatchTool(use.name, toolInput, ctx);
        } catch (err) {
          isError = true;
          resultText = err instanceof Error ? err.message : String(err);
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: resultText,
          is_error: isError,
        });

        // Sprint 13B: surface structured recommendations to the client so an
        // approval can persist the real provider/entity/action — never parsed
        // from the rendered prose. Grounded data only; emitted alongside the
        // tool result, never affecting the model loop.
        if (!isError && use.name === "get_recommendations") {
          const items = parseRecommendationsResult(resultText);
          if (items.length > 0) {
            yield { type: "recommendations", items };
          }
        }
      }

      messages.push({ role: "assistant", content: final.content });
      messages.push({ role: "user", content: toolResults });
      toolRounds++;
    }

    yield {
      type: "done",
      model: decision.model,
      escalated: decision.escalated,
      stopReason,
      toolRounds,
      usage: { inputTokens, outputTokens },
    };
  } catch (err) {
    // Phase 1 (debug instrumentation): the request is failing before generation
    // (inputTokens=0 / stopReason=error). Surface the FULL Anthropic error so we
    // can see the status, error type, and request-validation message. Logging
    // only — the behaviour below is unchanged.
    if (err instanceof Anthropic.APIError) {
      const body = err.error as
        | { error?: { type?: string; message?: string } }
        | undefined;
      console.error("[ANTHROPIC FULL ERROR]", JSON.stringify(err.error ?? null, null, 2));
      console.error("[ANTHROPIC STATUS]", err.status);
      console.error("[ANTHROPIC TYPE]", body?.error?.type ?? err.name);
      console.error("[ANTHROPIC VALIDATION]", body?.error?.message ?? err.message);
    } else {
      console.error("[ANTHROPIC FULL ERROR]", err);
      console.error("[ANTHROPIC STATUS]", "n/a (non-API error)");
      console.error(
        "[ANTHROPIC TYPE]",
        err instanceof Error ? err.name : typeof err
      );
    }
    yield {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    // Still emit a done so consumers can finalize accounting / release slots.
    yield {
      type: "done",
      model: decision.model,
      escalated: decision.escalated,
      stopReason: stopReason ?? "error",
      toolRounds,
      usage: { inputTokens, outputTokens },
    };
  }
}
