"use client";

/**
 * AI Studio Shell — region state context (Sprint 63I).
 *
 * Holds per-region UI state (collapsed/visible) so each region is independently
 * controllable and replaceable. This is the seam future capabilities plug into
 * (detach into floating window, split view, multiple canvases) WITHOUT changing
 * region components. No business logic — shell state only.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { StudioRegionId } from "./regions";

interface ShellState {
  /** Collapsed regions (nav/activity/dock are collapsible). */
  collapsed: Partial<Record<StudioRegionId, boolean>>;
  toggleRegion: (id: StudioRegionId) => void;
  /** Set a region's collapsed state explicitly (idempotent; strict-mode safe). */
  setRegionCollapsed: (id: StudioRegionId, value: boolean) => void;
  isCollapsed: (id: StudioRegionId) => boolean;
}

const ShellContext = createContext<ShellState | null>(null);

export function StudioShellProvider({
  children,
  initialCollapsed,
}: {
  children: React.ReactNode;
  initialCollapsed?: Partial<Record<StudioRegionId, boolean>>;
}) {
  const [collapsed, setCollapsed] = useState<Partial<Record<StudioRegionId, boolean>>>(
    initialCollapsed ?? {}
  );

  const toggleRegion = useCallback((id: StudioRegionId) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setRegionCollapsed = useCallback((id: StudioRegionId, value: boolean) => {
    setCollapsed((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
  }, []);

  const isCollapsed = useCallback(
    (id: StudioRegionId) => Boolean(collapsed[id]),
    [collapsed]
  );

  const value = useMemo<ShellState>(
    () => ({ collapsed, toggleRegion, setRegionCollapsed, isCollapsed }),
    [collapsed, toggleRegion, setRegionCollapsed, isCollapsed]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useStudioShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useStudioShell must be used within a StudioShellProvider");
  }
  return ctx;
}
