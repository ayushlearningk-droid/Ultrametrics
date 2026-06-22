"use client";

/**
 * Ask Ultrametrics — client hook (Phase 1 + U1 Steps 4–5).
 *
 * Drives the /api/ai/chat SSE endpoint: appends the user turn, streams the
 * assistant reply token-by-token, and round-trips the `escalated` flag so
 * escalation stays sticky for the conversation.
 *
 * U1 Step 4 — lazily creates a persisted conversation on first send and threads
 * its id to the chat route. U1 Step 5 — hydrates the last conversation per
 * workspace after refresh (URL ?c= override → localStorage), clears the thread
 * on a workspace switch, and uses a monotonic generation token to drop any
 * in-flight stream that belongs to a previous workspace (R3 guard).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatStreamEvent } from "@/lib/ai/types";
import type { AiMessage } from "@/types/database";

export interface UseAskUltrametrics {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  /** U1 Step 4: the active persisted conversation, or null until first send. */
  conversationId: string | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
  /** Start a fresh thread (clears messages + conversationId). */
  newChat: () => void;
  /** U1 Step 5: load a persisted conversation's messages into the thread. */
  loadConversation: (id: string) => Promise<void>;
}

/** Title for a lazily-created conversation: the first user message, truncated. */
const TITLE_MAX = 80;

/** Per-workspace localStorage key for the last-open conversation (U1 Step 5). */
function storageKey(workspaceId: string): string {
  return `ask:current:${workspaceId}`;
}

export function useAskUltrametrics(
  workspaceId: string | null = null
): UseAskUltrametrics {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // U1 Step 4: active conversation. A ref mirrors state so send() reads the
  // freshly-created id within the same tick (no stale closure).
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  // Sticky escalation: round-tripped to the server on each turn.
  const escalatedRef = useRef(false);

  // U1 Step 5: latest workspace id (for callbacks); a monotonic generation token
  // bumped on reset/switch to invalidate stale stream/hydrate results (R3); and
  // a hydrated flag so persistence never clears the key before hydration.
  const wsRef = useRef<string | null>(workspaceId);
  wsRef.current = workspaceId;
  const generationRef = useRef(0);
  const hydratedRef = useRef(false);

  const reset = useCallback(() => {
    generationRef.current += 1; // invalidate any in-flight stream/hydrate
    setMessages([]);
    setError(null);
    setStreaming(false);
    setConversationId(null);
    conversationIdRef.current = null;
    escalatedRef.current = false;
  }, []);

  // U1 Step 4/5: fresh thread + forget the restored id so a refresh after New
  // Chat starts empty (write-only persistence never clears the key otherwise).
  const newChat = useCallback(() => {
    reset();
    if (wsRef.current) {
      try {
        localStorage.removeItem(storageKey(wsRef.current));
      } catch {
        /* localStorage unavailable — ignore */
      }
    }
  }, [reset]);

  /**
   * Ensure a persisted conversation exists, lazily creating one on the first
   * send of a thread via the existing POST /api/ai/conversations. Best-effort:
   * a failure returns null and the chat proceeds unpersisted (UX unchanged).
   */
  const ensureConversation = useCallback(
    async (firstText: string): Promise<string | null> => {
      if (conversationIdRef.current) return conversationIdRef.current;
      try {
        const res = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: firstText.slice(0, TITLE_MAX) }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          conversation?: { id?: string };
        };
        const id = data.conversation?.id ?? null;
        if (id) {
          conversationIdRef.current = id;
          setConversationId(id);
        }
        return id;
      } catch {
        return null;
      }
    },
    []
  );

  /**
   * U1 Step 5: load a persisted conversation into the thread. Generation-guarded
   * so a workspace switch mid-fetch discards the stale result; a 404 / deleted id
   * falls back to the empty New Chat and clears the saved key.
   */
  const loadConversation = useCallback(async (id: string): Promise<void> => {
    const gen = generationRef.current;
    const ws = wsRef.current;
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (generationRef.current !== gen) return; // switched away — discard
      if (!res.ok) {
        if (ws) {
          try {
            localStorage.removeItem(storageKey(ws));
          } catch {
            /* ignore */
          }
        }
        return; // graceful fallback: stay on the empty New Chat
      }
      const data = (await res.json()) as {
        conversation?: { id?: string };
        messages?: AiMessage[];
      };
      if (generationRef.current !== gen) return;
      const loaded: ChatMessage[] = (data.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      conversationIdRef.current = id;
      setConversationId(id);
      setMessages(loaded);
    } catch {
      // Network error — leave the empty thread; never crash.
    }
  }, []);

  // U1 Step 5 hydration: on mount AND whenever the workspace changes, reset the
  // in-memory thread (clears the previous workspace's chat) and restore that
  // workspace's last conversation from ?c= (override) or localStorage.
  useEffect(() => {
    reset();
    hydratedRef.current = false;
    if (!workspaceId) {
      hydratedRef.current = true;
      return;
    }
    let id: string | null = null;
    try {
      id = new URLSearchParams(window.location.search).get("c");
    } catch {
      /* ignore */
    }
    if (!id) {
      try {
        id = localStorage.getItem(storageKey(workspaceId));
      } catch {
        /* ignore */
      }
    }
    if (id) {
      void loadConversation(id).finally(() => {
        hydratedRef.current = true;
      });
    } else {
      hydratedRef.current = true;
    }
  }, [workspaceId, reset, loadConversation]);

  // U1 Step 5: persist the active conversation per workspace (write-only; New
  // Chat clears the key explicitly, so this never erases it before hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (workspaceId && conversationId) {
      try {
        localStorage.setItem(storageKey(workspaceId), conversationId);
      } catch {
        /* ignore */
      }
    }
  }, [workspaceId, conversationId]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      // R3: tie this stream to the current generation; a workspace switch
      // (reset) bumps the generation and all of this stream's effects are dropped.
      const gen = generationRef.current;

      setError(null);
      setStreaming(true);

      const history: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      // Show the user turn + an empty assistant turn we stream into.
      setMessages([...history, { role: "assistant", content: "" }]);

      const appendToAssistant = (delta: string) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + delta };
          }
          return next;
        });
      };

      // U1 Step 4: lazily ensure a persisted conversation (best-effort). null
      // when creation fails — the chat then runs exactly as before (unpersisted).
      const cid = await ensureConversation(trimmed);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            escalated: escalatedRef.current,
            ...(cid ? { conversationId: cid } : {}),
          }),
        });

        if (!res.ok || !res.body) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let event: ChatStreamEvent;
            try {
              event = JSON.parse(payload) as ChatStreamEvent;
            } catch {
              continue;
            }
            // R3: drop any event from a stream that a workspace switch invalidated.
            if (generationRef.current !== gen) continue;
            if (event.type === "text") {
              appendToAssistant(event.delta);
            } else if (event.type === "done") {
              escalatedRef.current = event.escalated;
            } else if (event.type === "error") {
              setError(event.message);
            }
          }
        }
      } catch (err) {
        if (generationRef.current === gen) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (generationRef.current === gen) {
          setStreaming(false);
        }
      }
    },
    [messages, streaming, ensureConversation]
  );

  return {
    messages,
    streaming,
    error,
    conversationId,
    send,
    reset,
    newChat,
    loadConversation,
  };
}
