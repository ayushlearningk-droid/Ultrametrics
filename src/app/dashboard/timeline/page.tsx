/**
 * Unified AI Activity Timeline — page (Sprint 23).
 *
 * Server-aggregates a chronological activity feed from EXISTING data only:
 * sync jobs, AI recommendations (action_queue), action executions, and
 * rollbacks (executions with original_execution_id). No new queries, no backend
 * redesign — reuses getSyncJobsByWorkspace / listActions / listExecutions.
 * Renders the client TimelineView (filters · search · grouping · motion · a11y).
 */

import { getDashboardContext } from "@/lib/data/workspaces";
import {
  getSyncJobsByWorkspace,
  getConnectorsByWorkspace,
} from "@/lib/data/dashboard";
import { listActions } from "@/lib/data/action-queue";
import { listExecutions } from "@/lib/data/action-executions";
import {
  TimelineView,
  type TimelineEvent,
  type TLStatus,
} from "@/components/dashboard/timeline-view";
import type { ActionExecutionRow } from "@/types/database";

export const metadata = { title: "Timeline" };

/** Cap on actions scanned for executions (bounds the per-action N+1 fetch). */
const ACTION_SCAN_LIMIT = 50;

function execStatus(state: ActionExecutionRow["state"]): TLStatus {
  if (state === "succeeded" || state === "rolled_back") return "success";
  if (state === "failed" || state === "rollback_failed") return "failed";
  if (state === "cancelled") return "warning";
  return "pending";
}

export default async function TimelinePage() {
  const context = await getDashboardContext();
  const workspaces = context?.workspaces ?? [];
  const currentWorkspaceId = context?.currentWorkspaceId ?? null;
  const ws = workspaces.find((w) => w.id === currentWorkspaceId);

  if (!currentWorkspaceId || !ws) {
    return <TimelineView events={[]} />;
  }

  const [jobs, connectors, actions] = await Promise.all([
    getSyncJobsByWorkspace(currentWorkspaceId, 30),
    getConnectorsByWorkspace(currentWorkspaceId),
    listActions(currentWorkspaceId),
  ]);

  const connectorMap = Object.fromEntries(connectors.map((c) => [c.id, c]));
  const scannedActions = actions.slice(0, ACTION_SCAN_LIMIT);
  const actionMap = Object.fromEntries(scannedActions.map((a) => [a.id, a]));

  // Executions + rollbacks — reuse listExecutions per action (bounded).
  const execLists = await Promise.all(
    scannedActions.map((a) => listExecutions(a.id))
  );
  const executions = execLists.flat();

  const events: TimelineEvent[] = [];

  // ── Sync ──
  for (const job of jobs) {
    const c = connectorMap[job.connector_id];
    const name = c?.name ?? "Connector";
    const status: TLStatus =
      job.status === "completed"
        ? "success"
        : job.status === "failed"
          ? "failed"
          : "pending";
    events.push({
      id: `sync-${job.id}`,
      category: "sync",
      status,
      title:
        job.status === "completed"
          ? `${name} sync complete`
          : job.status === "failed"
            ? `${name} sync failed`
            : `${name} sync ${job.status}`,
      description:
        job.status === "completed"
          ? `${(job.records_processed ?? 0).toLocaleString()} records processed`
          : (job.error_message ?? undefined),
      provider: c?.provider ?? undefined,
      createdAt: job.created_at,
      cta: { label: "View sync jobs", href: "/dashboard/sync-jobs" },
    });
  }

  // ── AI recommendations (action_queue) ──
  for (const a of scannedActions) {
    events.push({
      id: `ai-${a.id}`,
      category: "ai",
      status: "info",
      title: `AI recommended · ${a.title}`,
      description: a.rationale ?? a.expected_impact ?? undefined,
      provider: a.provider ?? undefined,
      createdAt: a.created_at,
      cta: { label: "Open Action Queue", href: "/dashboard/actions" },
    });
  }

  // ── Action executions + rollbacks ──
  for (const e of executions) {
    const a = actionMap[e.action_id];
    const actionTitle = a?.title ?? "action";
    const isRollback = e.original_execution_id != null;
    const status = execStatus(e.state);
    events.push({
      id: `exec-${e.id}`,
      category: isRollback ? "rollback" : "action",
      status,
      title: isRollback
        ? `Rolled back · ${actionTitle}`
        : e.dry_run
          ? `Dry run · ${actionTitle}`
          : `Executed · ${actionTitle}`,
      description:
        e.error_message ??
        (e.dry_run ? "Validated without provider execution." : undefined),
      provider: e.provider ?? a?.provider ?? undefined,
      createdAt: e.created_at,
      cta: { label: "Open Action Queue", href: "/dashboard/actions" },
    });
  }

  events.sort(
    (x, y) =>
      new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
  );

  return <TimelineView events={events} />;
}
