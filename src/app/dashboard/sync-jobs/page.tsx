import { cookies } from "next/headers";
import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
  getWorkspaceSyncSchedule,
} from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { DEMO_CONNECTORS, DEMO_SYNC_JOBS } from "@/lib/dev/demo-data";
import { PipelineView } from "@/components/pipeline/pipeline-view";
import type { SyncJobStatus } from "@/types/database";

export const metadata = { title: "Pipeline" };

function formatProvider(p: string) {
  return (
    CONNECTOR_PROVIDERS.find((x) => x.id === p)?.name ??
    p.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function durationMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return new Date(end).getTime() - new Date(start).getTime();
}

export default async function SyncJobsPage() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("__dev_screenshot")?.value === "1";

  const workspaces = await getUserWorkspaces();
  const wsId = await getCurrentWorkspaceId(workspaces);

  const [realJobs, realConnectors, schedule] = await Promise.all([
    wsId ? getSyncJobsByWorkspace(wsId, 50) : Promise.resolve([]),
    wsId ? getConnectorsByWorkspace(wsId) : Promise.resolve([]),
    wsId ? getWorkspaceSyncSchedule(wsId) : Promise.resolve(null),
  ]);

  // Demo fallback (screenshot mode / empty workspace) — clearly marked downstream
  const usingExample = isDemo || realJobs.length === 0;
  const jobs = usingExample ? DEMO_SYNC_JOBS : realJobs;
  const connectors = usingExample ? DEMO_CONNECTORS : realConnectors;

  const cMap = Object.fromEntries(connectors.map((c) => [c.id, c]));

  const shaped = jobs.map((j) => {
    const con = cMap[j.connector_id];
    const startedAt =
      "started_at" in j ? (j as { started_at: string | null }).started_at : null;
    const completedAt =
      "completed_at" in j
        ? (j as { completed_at: string | null }).completed_at
        : null;
    return {
      id: j.id,
      status: j.status as SyncJobStatus,
      name: con?.name ?? "Unknown source",
      provider: con?.provider ?? "unknown",
      providerName: formatProvider(con?.provider ?? ""),
      records: ("records_processed" in j ? j.records_processed : 0) ?? 0,
      createdAt: j.created_at,
      durationMs: durationMs(startedAt ?? null, completedAt ?? null),
      error:
        "error_message" in j
          ? (j as { error_message: string | null }).error_message
          : null,
    };
  });

  // Per-source lanes for the flow diagram (real connectors that have run)
  const lanes = connectors
    .filter((c) => c.provider === "meta_ads" || c.provider === "google_ads")
    .map((c) => {
      const laneJobs = shaped.filter((j) => j.provider === c.provider);
      const lastJob = laneJobs[0] ?? null;
      return {
        provider: c.provider,
        name: c.name,
        providerName: formatProvider(c.provider),
        status: c.status,
        lastStatus: lastJob?.status ?? null,
        lastSync: c.last_synced_at ?? lastJob?.createdAt ?? null,
        lastRows: laneJobs.find((j) => j.status === "completed")?.records ?? 0,
      };
    });

  const completed = shaped.filter((j) => j.status === "completed");
  const totalRows = completed.reduce((s, j) => s + j.records, 0);
  const lastSuccess = completed[0]?.createdAt ?? null;
  const activeSources = connectors.filter((c) => c.status === "active").length;

  return (
    <PipelineView
      jobs={shaped}
      lanes={lanes}
      schedule={
        schedule
          ? {
              frequency: schedule.frequency,
              enabled: schedule.enabled,
              nextRunAt: schedule.next_run_at,
            }
          : usingExample
          ? { frequency: "daily", enabled: true, nextRunAt: null, isExample: true }
          : null
      }
      summary={{
        activeSources,
        destinations: lanes.length > 0 ? 1 : 0,
        lastSuccess,
        totalRows,
        completed: completed.length,
        failed: shaped.filter((j) => j.status === "failed").length,
      }}
      isExample={usingExample}
    />
  );
}
