"use client";

/**
 * Ask Ultrametrics — shared conversation provider (V2, Step 3).
 *
 * Owns ONE useAskUltrametrics() instance plus the drawer open/close state, and
 * exposes both through context so multiple surfaces (bottom command bar, AI
 * drawer, …) share a single conversation. Without this, each useAskUltrametrics()
 * call would be an independent chat.
 *
 * Pure state ownership — no API changes, no drawer/shell/bar wiring here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useAskUltrametrics,
  type UseAskUltrametrics,
} from "@/components/os/use-ask-ultrametrics";

interface AskContextValue extends UseAskUltrametrics {
  /** Whether the AI drawer is open. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Sprint 3A: a reply completed while the drawer was closed (orb badge). */
  hasUnread: boolean;
}

const AskContext = createContext<AskContextValue | null>(null);

export function AskProvider({
  children,
  workspaceId,
}: {
  children: React.ReactNode;
  /** U1 Step 5: scopes conversation hydration/persistence + switch reset. */
  workspaceId: string | null;
}) {
  const ask = useAskUltrametrics(workspaceId);
  const [isOpen, setIsOpen] = useState(false);
  // Sprint 3A: unread = a successful reply finished while the drawer was closed.
  const [hasUnread, setHasUnread] = useState(false);
  const prevStreamingRef = useRef(false);

  // Opening the drawer always marks everything as read.
  const open = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Detect the streaming true→false edge: a reply that completed while the
  // drawer was closed (and without an error) becomes an unread indicator.
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = ask.streaming;
    if (wasStreaming && !ask.streaming && !isOpen && !ask.error) {
      setHasUnread(true);
    }
  }, [ask.streaming, ask.error, isOpen]);

  // A workspace switch drops any stale unread from the previous workspace.
  useEffect(() => {
    setHasUnread(false);
  }, [workspaceId]);

  const value = useMemo<AskContextValue>(
    () => ({ ...ask, isOpen, open, close, toggle, hasUnread }),
    [ask, isOpen, open, close, toggle, hasUnread]
  );

  return <AskContext.Provider value={value}>{children}</AskContext.Provider>;
}

/** Access the shared Ask conversation + drawer state. Throws outside the provider. */
export function useAsk(): AskContextValue {
  const ctx = useContext(AskContext);
  if (!ctx) {
    throw new Error("useAsk must be used within an <AskProvider>");
  }
  return ctx;
}
