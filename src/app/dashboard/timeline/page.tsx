/**
 * Timeline — stub (Sprint 4 Phase C).
 *
 * Placeholder so the Sidebar V7 "Timeline" item resolves. The Marketing
 * Intelligence Timeline is a later sprint.
 */

import { Waypoints } from "lucide-react";

export const metadata = { title: "Timeline" };

export default function TimelinePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-6 py-16 text-center">
        <Waypoints className="mb-3 h-6 w-6 text-foreground-muted" />
        <h1 className="text-[15px] font-semibold text-foreground">Timeline</h1>
        <p className="mt-1 max-w-sm text-[13px] text-foreground-muted">
          A chronological view of what changed and why — ROAS shifts, spend
          spikes, tracking issues. Coming soon.
        </p>
      </div>
    </div>
  );
}
