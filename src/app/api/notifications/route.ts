import { NextResponse } from "next/server";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { getSyncJobsByWorkspace, getConnectorsByWorkspace } from "@/lib/data/dashboard";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  connectorName: string;
  provider: string;
  status: string;
  records: number;
  createdAt: string;
  completedAt: string | null;
}

export async function GET() {
  try {
    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json({ notifications: [] });
    }

    const [jobs, connectors] = await Promise.all([
      getSyncJobsByWorkspace(workspaceId, 20),
      getConnectorsByWorkspace(workspaceId),
    ]);

    const connectorMap = Object.fromEntries(connectors.map((c) => [c.id, c]));

    const notifications: Notification[] = jobs.map((job) => {
      const connector = connectorMap[job.connector_id];
      const connectorName = connector?.name ?? "Unknown";
      const provider = connector?.provider ?? "unknown";

      let message = "";
      let type: NotificationType = "info";

      switch (job.status) {
        case "completed":
          message = `${connectorName} synced ${(job.records_processed ?? 0).toLocaleString()} records`;
          type = "success";
          break;
        case "failed":
          message = `${connectorName} sync failed`;
          type = "error";
          break;
        case "running":
          message = `${connectorName} syncing…`;
          type = "info";
          break;
        case "pending":
          message = `${connectorName} sync queued`;
          type = "info";
          break;
        default:
          message = `${connectorName} sync ${job.status}`;
          type = "info";
      }

      return {
        id: job.id,
        type,
        message,
        connectorName,
        provider,
        status: job.status,
        records: job.records_processed ?? 0,
        createdAt: job.created_at,
        completedAt: job.completed_at ?? null,
      };
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[notifications] fetch failed", error);
    return NextResponse.json({ notifications: [] });
  }
}
