"use client";

/**
 * Workspace Sessions — presentation state (Sprint 63U).
 *
 * Holds the session list and the presentation-only lifecycle actions: duplicate,
 * archive, and delete. Deterministic — duplicated sessions derive their ids and
 * timestamps from a monotonic counter over the fixed clock base (no Date.now, no
 * randomness). Resume is handled by the panel (it reopens the Unified Workspace);
 * the context only mutates the in-memory list. No backend.
 */

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  SAMPLE_SESSIONS,
  SESSION_BASE,
  type WorkspaceSession,
} from "./sessions-data";

interface SessionsContextValue {
  sessions: WorkspaceSession[];
  duplicate: (id: string) => void;
  archive: (id: string) => void;
  remove: (id: string) => void;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<WorkspaceSession[]>(SAMPLE_SESSIONS);
  // Deterministic counter for duplicated session ids/timestamps.
  const seq = useRef(0);

  const value = useMemo<SessionsContextValue>(
    () => ({
      sessions,
      duplicate: (id) =>
        setSessions((prev) => {
          const src = prev.find((s) => s.id === id);
          if (!src) return prev;
          seq.current += 1;
          const at = SESSION_BASE + seq.current * 3_600_000;
          const copy: WorkspaceSession = {
            ...src,
            id: `${src.id}-copy-${seq.current}`,
            status: "active",
            startedAt: at,
            lastActivity: at,
            stage: "Preparing Brief",
            assets: 0,
          };
          return [copy, ...prev];
        }),
      archive: (id) =>
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "archived" } : s))),
      remove: (id) => setSessions((prev) => prev.filter((s) => s.id !== id)),
    }),
    [sessions]
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): SessionsContextValue {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions must be used within a SessionsProvider");
  return ctx;
}
