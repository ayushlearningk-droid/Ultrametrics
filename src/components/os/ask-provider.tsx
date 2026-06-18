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
  useMemo,
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
}

const AskContext = createContext<AskContextValue | null>(null);

export function AskProvider({ children }: { children: React.ReactNode }) {
  const ask = useAskUltrametrics();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo<AskContextValue>(
    () => ({ ...ask, isOpen, open, close, toggle }),
    [ask, isOpen, open, close, toggle]
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
