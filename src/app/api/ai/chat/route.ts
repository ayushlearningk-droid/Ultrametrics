/**
 * Ask Ultrametrics — chat route (Phase 1).
 *
 * POST /api/ai/chat — streams a read-only, workspace-grounded AI turn as SSE.
 *
 * Order is load-bearing: authenticate → resolve workspace SERVER-SIDE → RBAC
 * (member+) → cost gates (rate + concurrency) BEFORE opening the model stream →
 * stream. workspaceId is never taken from the client. Cost gates run in
 * observe-mode when AI_ENFORCE=false (breaches are logged, not blocked).
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { requireWorkspaceRole } from "@/lib/api/require-workspace-role";
import {
  getCurrentWorkspaceId,
  getUserWorkspaces,
} from "@/lib/data/workspaces";
import {
  getConnectorsByWorkspace,
  getSubscriptionByWorkspace,
} from "@/lib/data/dashboard";
import { CAPABILITIES } from "@/lib/metrics/capabilities";
import type { MetricsProvider } from "@/lib/metrics/types";
import type { ChatMessage, ChatStreamEvent, WorkspaceContext } from "@/lib/ai/types";
import { streamWorkspaceChat } from "@/lib/ai/anthropic";
import {
  getPlanLimits,
  aiEnforced,
  checkRateLimit,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  logUsage,
} from "@/lib/ai/limits";
import { appendMessage } from "@/lib/data/conversations";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";

export const runtime = "nodejs";

interface ChatRequestBody {
  messages?: unknown;
  escalated?: unknown;
  /** Sprint 1: optional target conversation for persistence (back-compat). */
  conversationId?: unknown;
}

/** Validate + narrow the client-supplied conversation history. */
function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (
      typeof m !== "object" ||
      m === null ||
      ((m as { role?: unknown }).role !== "user" &&
        (m as { role?: unknown }).role !== "assistant") ||
      typeof (m as { content?: unknown }).content !== "string"
    ) {
      return null;
    }
    out.push({
      role: (m as ChatMessage).role,
      content: (m as ChatMessage).content,
    });
  }
  if (out[out.length - 1].role !== "user") return null;
  return out;
}

function sseEncode(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace found" }, { status: 400 });
  }

  // RBAC: any member may ask (read-only).
  const access = await requireWorkspaceRole(workspaceId, ["owner", "admin", "member"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  // Sprint 16.1: AI Insights feature flag — when disabled for this workspace,
  // Ask Ultrametrics is unavailable (server-enforced, not just hidden in the UI).
  const wsSettings = toSettingsValues(await getWorkspaceSettings(workspaceId));
  if (!wsSettings.ai_insights_enabled) {
    return NextResponse.json(
      { error: "AI Insights are disabled for this workspace." },
      { status: 403 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      { error: "messages must be a non-empty array ending in a user turn" },
      { status: 400 }
    );
  }

  // Plan-derived limits.
  const subscription = await getSubscriptionByWorkspace(workspaceId);
  const limits = getPlanLimits(subscription?.plan_id);
  const enforced = aiEnforced();

  // ── Cost gates (BEFORE opening the stream) ──
  const rate = checkRateLimit(workspaceId, limits);
  if (!rate.ok) {
    if (enforced) {
      return NextResponse.json({ error: rate.reason }, { status: 429 });
    }
    console.warn(`[ai.observe] would block: ${rate.reason} (workspace=${workspaceId})`);
  }

  const slot = acquireConcurrencySlot(workspaceId, limits);
  if (!slot.ok) {
    if (enforced) {
      return NextResponse.json({ error: slot.reason }, { status: 429 });
    }
    console.warn(`[ai.observe] would block: ${slot.reason} (workspace=${workspaceId})`);
  }
  // A slot is held only when actually acquired; release exactly once.
  const slotHeld = slot.ok;
  let released = false;
  const release = () => {
    if (slotHeld && !released) {
      released = true;
      releaseConcurrencySlot(workspaceId);
    }
  };

  // ── Build server-resolved workspace context ──
  const connectors = await getConnectorsByWorkspace(workspaceId);
  const connectedProviders = [
    ...new Set(
      connectors
        .filter((c) => c.status === "active" && c.provider in CAPABILITIES)
        .map((c) => c.provider as MetricsProvider)
    ),
  ];
  const workspaceName =
    workspaces.find((w) => w.id === workspaceId)?.name ?? "your workspace";

  const ctx: WorkspaceContext = {
    workspaceId,
    workspaceName,
    connectedProviders,
    todayISO: new Date().toISOString().slice(0, 10),
  };

  const lastUser = messages[messages.length - 1].content;
  const approxInputTokens = Math.ceil(JSON.stringify(messages).length / 4);

  const userId = access.userId;

  // Sprint 1 persistence (best-effort, never blocks the chat). When the client
  // supplies a conversationId it owns (RLS-enforced), persist the user turn
  // before streaming; the assistant turn is persisted on the `done` event.
  const conversationId =
    typeof body.conversationId === "string" && body.conversationId
      ? body.conversationId
      : null;
  if (conversationId) {
    try {
      await appendMessage({
        conversationId,
        role: "user",
        content: lastUser,
      });
    } catch (err) {
      console.warn(
        `[ai.persist] failed to store user message (conversation=${conversationId}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      // Sprint 1: accumulate the streamed assistant text to persist on `done`.
      let assistantBuffer = "";
      try {
        for await (const event of streamWorkspaceChat({
          ctx,
          messages,
          signals: {
            userMessage: lastUser,
            approxInputTokens,
            toolRoundsSoFar: 0,
            stickyEscalated: body.escalated === true,
            opusAllowed: limits.opusAllowed,
          },
        })) {
          controller.enqueue(encoder.encode(sseEncode(event)));
          if (event.type === "text") {
            assistantBuffer += event.delta;
          }
          if (event.type === "done") {
            logUsage({
              workspaceId,
              userId,
              model: event.model,
              escalated: event.escalated,
              routeReason: "",
              inputTokens: event.usage.inputTokens,
              outputTokens: event.usage.outputTokens,
              toolRounds: event.toolRounds,
              stopReason: event.stopReason,
            });
            // Persist the assistant turn (best-effort; never aborts the stream).
            if (conversationId && assistantBuffer) {
              try {
                await appendMessage({
                  conversationId,
                  role: "assistant",
                  content: assistantBuffer,
                  metadata: {
                    model: event.model,
                    escalated: event.escalated,
                    inputTokens: event.usage.inputTokens,
                    outputTokens: event.usage.outputTokens,
                    stopReason: event.stopReason,
                  },
                });
              } catch (err) {
                console.warn(
                  `[ai.persist] failed to store assistant message (conversation=${conversationId}): ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
              }
            }
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            sseEncode({
              type: "error",
              message: err instanceof Error ? err.message : String(err),
            })
          )
        );
      } finally {
        release();
        controller.close();
      }
    },
    cancel() {
      release();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
