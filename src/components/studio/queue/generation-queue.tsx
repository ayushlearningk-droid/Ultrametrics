"use client";

/**
 * Production Generation Queue (Sprint 63).
 *
 * The Creative Production Pipeline — not a loading screen. Composes the reusable
 * pieces (summary · toolbar · grouped items · details) over the queue state,
 * reusing media, employees, the Movie stages, and the Forecast Foundation.
 * Mirrors the Queue Foundation's states; no scheduling logic, no backend. Plugs
 * into the Unified Workspace as a region.
 */

import { ListChecks } from "lucide-react";
import { GenerationQueueProvider } from "./queue-context";
import { QueueSummary } from "./queue-summary";
import { QueueToolbar } from "./queue-toolbar";
import { QueueGroups } from "./queue-groups";
import { QueueDetails } from "./queue-details";
import type { QueueItem } from "./queue-data";

function Body() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-1 py-4">
      <header className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <ListChecks className="h-3.5 w-3.5 text-brand" />
          Creative Production Pipeline
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Generation Queue</h2>
      </header>

      <QueueSummary />
      <QueueToolbar />
      <QueueGroups />
      <QueueDetails />
    </div>
  );
}

export function GenerationQueue({ source, loading }: { source?: QueueItem[]; loading?: boolean }) {
  return (
    <GenerationQueueProvider source={source} loading={loading}>
      <Body />
    </GenerationQueueProvider>
  );
}
