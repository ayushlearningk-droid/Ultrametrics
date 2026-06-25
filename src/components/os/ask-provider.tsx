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
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

interface AskContextValue extends UseAskUltrametrics {
  /** Sprint 16.1: whether AI Insights (Ask) is enabled for this workspace. */
  aiEnabled: boolean;
  /** Whether the AI drawer is open. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Sprint 3A: a reply completed while the drawer was closed (orb badge). */
  hasUnread: boolean;
  /** Sprint 6: bumped to request focusing the conversation search input. */
  searchFocusSignal: number;
  /** Sprint 6: focus the conversation search input (consumed by the rail). */
  focusSearch: () => void;
  /** Sprint 6: bumped to request focusing the Ask composer input. */
  composerFocusSignal: number;
  /** Sprint 6: focus the Ask composer input (consumed by the drawer). */
  focusComposer: () => void;
}

const AskContext = createContext<AskContextValue | null>(null);

export function AskProvider({
  children,
  workspaceId,
  aiEnabled = true,
}: {
  children: React.ReactNode;
  /** U1 Step 5: scopes conversation hydration/persistence + switch reset. */
  workspaceId: string | null;
  /** Sprint 16.1: AI Insights flag — when false, Ask cannot be opened. */
  aiEnabled?: boolean;
}) {
  const ask = useAskUltrametrics(workspaceId);
  const [isOpen, setIsOpen] = useState(false);
  // Sprint 3A: unread = a successful reply finished while the drawer was closed.
  const [hasUnread, setHasUnread] = useState(false);
  const prevStreamingRef = useRef(false);

  // Opening the drawer always marks everything as read. When AI Insights is
  // disabled for the workspace, opening is a no-op (the surfaces are hidden).
  const open = useCallback(() => {
    if (!aiEnabled) return;
    setIsOpen(true);
    setHasUnread(false);
  }, [aiEnabled]);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Sprint 6: search-focus signal — bumping it asks the rail to focus its input.
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);
  const focusSearch = useCallback(() => setSearchFocusSignal((n) => n + 1), []);
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  const focusComposer = useCallback(
    () => setComposerFocusSignal((n) => n + 1),
    []
  );

  // Sprint 6: AI keyboard shortcuts that need Ask context (live inside provider).
  //   A → open drawer · Shift+A → open + focus composer · N → open + new
  //   conversation · / → open + focus search.
  // (Single keys are suppressed while typing by the shortcut hook's focus guard.)
  useKeyboardShortcuts([
    { combo: "a", handler: () => open() },
    {
      combo: "shift+a",
      handler: () => {
        open();
        focusComposer();
      },
    },
    {
      combo: "n",
      handler: () => {
        open();
        ask.newChat();
      },
    },
    {
      combo: "/",
      handler: () => {
        open();
        focusSearch();
      },
    },
  ]);

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
    () => ({
      ...ask,
      aiEnabled,
      isOpen,
      open,
      close,
      toggle,
      hasUnread,
      searchFocusSignal,
      focusSearch,
      composerFocusSignal,
      focusComposer,
    }),
    [
      ask,
      aiEnabled,
      isOpen,
      open,
      close,
      toggle,
      hasUnread,
      searchFocusSignal,
      focusSearch,
      composerFocusSignal,
      focusComposer,
    ]
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
