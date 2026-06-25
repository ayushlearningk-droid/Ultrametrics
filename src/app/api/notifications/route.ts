/**
 * Unified Notifications (Sprint 22).
 *
 * Aggregates REAL events from existing data only (no new tables): recent sync
 * jobs (category "sync") and approved Action-Queue items (category "actions").
 * Read/dismissed state is tracked client-side (localStorage) — this route is a
 * read-only feed. workspaceId is resolved server-side; data layers are RLS-
 * scoped. Additive: extends the prior sync-only shape with category/title/cta.
 */

import { NextResponse } from "next/server";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import {
  getSyncJobsByWorkspace,
  getConnectorsByWorkspace,
} from "@/lib/data/dashboard";
import { listActions } from "@/lib/data/action-queue";

export type NotifCategory = "ai" | "sync" | "actions" | "reports" | "workspace";
export type NotifType = "success" | "failed" | "warning" | "info";

export interface Notification {
  id: string;
  category: NotifCategory;
  type: NotifType;
  title: string;
  description?: string;
  provider?: string;
  createdAt: string;
  cta?: { label: string; href: string };
}

export async function GET() {
  try {
    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);
    if (!workspaceId) return NextResponse.json({ notifications: [] });

    const [jobs, connectors, actions] = await Promise.all([
      getSyncJobsByWorkspace(workspaceId, 20),
      getConnectorsByWorkspace(workspaceId),
      listActions(workspaceId, { status: "approved" }),
    ]);

    const connectorMap = Object.fromEntries(connectors.map((c) => [c.id, c]));

    // ── Sync notifications ──
    const syncNotifs: Notification[] = jobs.map((job) => {
      const connector = connectorMap[job.connector_id];
      const name = connector?.name ?? "Connector";
      const provider = connector?.provider ?? "unknown";
      const records = job.records_processed ?? 0;

      let type: NotifType = "info";
      let title = `${name} sync ${job.status}`;
      let description: string | undefined;
      switch (job.status) {
        case "completed":
          type = "success";
          title = `${name} sync complete`;
          description = `${records.toLocaleString()} records processed`;
          break;
        case "failed":
          type = "failed";
          title = `${name} sync failed`;
          description = job.error_message ?? "The sync did not complete.";
          break;
        case "running":
          title = `${name} syncing…`;
          break;
        case "pending":
          title = `${name} sync queued`;
          break;
      }
      return {
        id: `sync-${job.id}`,
        category: "sync",
        type,
        title,
        description,
        provider,
        createdAt: job.created_at,
        cta: { label: "View sync jobs", href: "/dashboard/sync-jobs" },
      };
    });

    // ── Action notifications (approved, ready to execute) ──
    const actionNotifs: Notification[] = actions.map((a) => ({
      id: `action-${a.id}`,
      category: "actions",
      type: "info",
      title: `Action ready · ${a.title}`,
      description: a.rationale ?? a.expected_impact ?? undefined,
      createdAt: a.created_at,
      cta: { label: "Open Action Queue", href: "/dashboard/actions" },
    }));

    const notifications = [...syncNotifs, ...actionNotifs]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 40);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[notifications] fetch failed", error);
    return NextResponse.json({ notifications: [] });
  }
}
