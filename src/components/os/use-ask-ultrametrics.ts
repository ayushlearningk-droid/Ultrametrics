"use client";

/**
 * Ask Ultrametrics — client hook (Phase 1).
 *
 * Drives the /api/ai/chat SSE endpoint: appends the user turn, streams the
 * assistant reply token-by-token, and round-trips the `escalated` flag so
 * escalation stays sticky for the conversation. Read-only — it only displays
 * what the server streams.
 */

import { useCallback, useRef, useState } from "react";
import type { ChatMessage, ChatStreamEvent } from "@/lib/ai/types";

export interface UseAskUltrametrics {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

export function useAskUltrametrics(): UseAskUltrametrics {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sticky escalation: round-tripped to the server on each turn.
  const escalatedRef = useRef(false);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    escalatedRef.current = false;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

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

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            escalated: escalatedRef.current,
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
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming]
  );

  return { messages, streaming, error, send, reset };
}
