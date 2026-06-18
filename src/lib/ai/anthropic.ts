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

/** Output cap per response. Streaming, so well under SDK HTTP timeout limits. */
const MAX_OUTPUT_TOKENS = 4096;

/** Hard ceiling on tool round-trips within a single turn. */
const MAX_TOOL_ROUNDS = 5;

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
          yield { type: "text", delta: event.delta.text };
        }
      }

      const final = await stream.finalMessage();
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
          resultText = await dispatchTool(
            use.name,
            (use.input ?? {}) as Record<string, unknown>,
            ctx
          );
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
