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
import type { AiConversation, AiMessage } from "@/types/database";

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
  /** Sprint 2: the user's conversations in this workspace (recent first). */
  conversations: AiConversation[];
  /** Re-fetch the conversation list for the active workspace. */
  refreshConversations: () => Promise<void>;
  /** Switch the thread to an existing conversation (clears the current one). */
  selectConversation: (id: string) => Promise<void>;
  /** Rename a conversation (optimistic; reverts to server on failure). */
  renameConversation: (id: string, title: string) => Promise<void>;
  /** Delete a conversation; starts a new chat if it was the active one. */
  deleteConversation: (id: string) => Promise<void>;
  /** Sprint 5: current search query (drives the list ?q= filter). */
  search: string;
  /** Set the search query (the rail debounces, then calls refreshConversations). */
  setSearch: (q: string) => void;
  /** Pin / unpin a conversation (optimistic; reconciles via refresh). */
  pinConversation: (id: string, pinned: boolean) => Promise<void>;
  /** Archive a conversation (optimistic remove; keeps the thread open). */
  archiveConversation: (id: string) => Promise<void>;
  /** Restore an archived conversation back into the active list. */
  restoreConversation: (id: string) => Promise<void>;
  /** Lazily fetch the workspace's ARCHIVED conversations (for the Archived section). */
  loadArchived: () => Promise<AiConversation[]>;
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
  // Sprint 2: the workspace's conversation list (powers the rail).
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  // Sprint 5: search query (the rail debounces). A ref mirrors it so the
  // generation-shared refreshConversations reads the latest value.
  const [search, setSearchState] = useState("");
  const searchRef = useRef("");
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

  // Sprint 2: re-fetch the workspace's conversation list (GET is server-scoped
  // to the active workspace + user via RLS). Generation-guarded so a workspace
  // switch mid-fetch discards the stale list.
  const refreshConversations = useCallback(async (): Promise<void> => {
    const gen = generationRef.current;
    try {
      const q = searchRef.current.trim();
      const url = q
        ? `/api/ai/conversations?q=${encodeURIComponent(q)}`
        : "/api/ai/conversations";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { conversations?: AiConversation[] };
      if (generationRef.current !== gen) return;
      setConversations(data.conversations ?? []);
    } catch {
      /* ignore — list simply isn't refreshed */
    }
  }, []);

  // Sprint 5: update the search query (no fetch here — the rail debounces and
  // then calls refreshConversations, which reads searchRef).
  const setSearch = useCallback((q: string) => {
    searchRef.current = q;
    setSearchState(q);
  }, []);

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
          // Sprint 2: surface the new thread in the rail.
          void refreshConversations();
        }
        return id;
      } catch {
        return null;
      }
    },
    [refreshConversations]
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

  // Sprint 2: switch the thread to an existing conversation. reset() clears the
  // current thread and bumps the generation (dropping any in-flight stream),
  // then loadConversation hydrates the selected one under the new generation.
  const selectConversation = useCallback(
    async (id: string): Promise<void> => {
      reset();
      await loadConversation(id);
    },
    [reset, loadConversation]
  );

  // Sprint 2: optimistic rename; reverts to server truth on failure.
  const renameConversation = useCallback(
    async (id: string, title: string): Promise<void> => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
      );
      try {
        const res = await fetch(`/api/ai/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
        if (!res.ok) await refreshConversations();
      } catch {
        await refreshConversations();
      }
    },
    [refreshConversations]
  );

  // Sprint 2: delete a conversation (optimistic removal). If it was the active
  // thread, start a fresh chat so the UI doesn't point at a deleted row.
  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      const wasCurrent = conversationIdRef.current === id;
      setConversations((prev) => prev.filter((c) => c.id !== id));
      try {
        await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      } catch {
        /* ignore — refresh below reconciles */
      }
      if (wasCurrent) newChat();
      await refreshConversations();
    },
    [newChat, refreshConversations]
  );

  // Sprint 5: pin / unpin (optimistic pinned_at, then reconcile via refresh).
  const pinConversation = useCallback(
    async (id: string, pinned: boolean): Promise<void> => {
      const stamp = pinned ? new Date().toISOString() : null;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned_at: stamp } : c))
      );
      try {
        await fetch(`/api/ai/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned }),
        });
      } catch {
        /* ignore — refresh below reconciles */
      }
      // Reconcile the pinned-first ordering from the server.
      await refreshConversations();
    },
    [refreshConversations]
  );

  // Sprint 5: archive (optimistic remove from the active list). Unlike delete,
  // the thread stays open and the data is preserved (archived_at set).
  const archiveConversation = useCallback(
    async (id: string): Promise<void> => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      try {
        await fetch(`/api/ai/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        });
      } catch {
        /* ignore — refresh below reconciles */
      }
      await refreshConversations();
    },
    [refreshConversations]
  );

  // Sprint 5: restore an archived conversation back into the active list.
  const restoreConversation = useCallback(
    async (id: string): Promise<void> => {
      try {
        await fetch(`/api/ai/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: false }),
        });
      } catch {
        /* ignore — refresh below reconciles */
      }
      await refreshConversations();
    },
    [refreshConversations]
  );

  // Sprint 5: lazily fetch the workspace's ARCHIVED conversations (the rail
  // calls this when the Archived section is expanded). Returns [] on failure.
  const loadArchived = useCallback(async (): Promise<AiConversation[]> => {
    try {
      const res = await fetch("/api/ai/conversations?archived=true");
      if (!res.ok) return [];
      const data = (await res.json()) as { conversations?: AiConversation[] };
      return data.conversations ?? [];
    } catch {
      return [];
    }
  }, []);

  // U1 Step 5 hydration: on mount AND whenever the workspace changes, reset the
  // in-memory thread (clears the previous workspace's chat) and restore that
  // workspace's last conversation from ?c= (override) or localStorage.
  useEffect(() => {
    reset();
    setConversations([]);
    // Sprint 5: clear any search when switching workspaces.
    searchRef.current = "";
    setSearchState("");
    hydratedRef.current = false;
    if (!workspaceId) {
      hydratedRef.current = true;
      return;
    }
    // Sprint 2: load this workspace's conversation list for the rail.
    void refreshConversations();
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
  }, [workspaceId, reset, loadConversation, refreshConversations]);

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
    conversations,
    refreshConversations,
    selectConversation,
    renameConversation,
    deleteConversation,
    search,
    setSearch,
    pinConversation,
    archiveConversation,
    restoreConversation,
    loadArchived,
  };
}
