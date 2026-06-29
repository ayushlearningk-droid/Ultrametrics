"use client";

/**
 * AI Studio Shell — L4 Floating Layer mount (Sprint 63I).
 *
 * A non-interactive overlay container reserving the floating layer: future
 * floating windows, split-view panes, detached panels, and command-driven
 * surfaces mount here without touching the region grid. Pointer-events are off
 * by default so it never blocks the shell beneath; mounted children opt back in.
 *
 * SCOPE: empty mount only — no floating windows built this sprint.
 */

import { ShellRegion } from "./shell-region";

export function StudioFloatingLayer({ children }: { children?: React.ReactNode }) {
  return (
    <ShellRegion
      id="floating"
      depth="L4"
      as="section"
      ariaLabel="Floating layer"
      className="pointer-events-none absolute inset-0 z-40"
    >
      {children}
    </ShellRegion>
  );
}
