import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { cn } from "@/lib/utils";
import type { SyncJobStatus } from "@/types/database";

export const metadata = { title: "Pipeline" };

function relativeTime(d: string | null) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatProvider(p: string) {
  return CONNECTOR_PROVIDERS.find((x) => x.id === p)?.name
    ?? p.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function duration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function groupByDay(jobs: { createdAt: string }[]) {
  const groups: Record<string, number[]> = {};
  jobs.forEach((j, i) => {
    const day = new Date(j.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!groups[day]) groups[day] = [];
    groups[day].push(i);
  });
  return groups;
}

const STATUS_CONFIG: Record<SyncJobStatus, { dot: string; label: string; text: string }> = {
  completed: { dot: "bg-emerald-400 shadow-emerald-400/40 shadow-[0_0_6px]", label: "Completed", text: "text-emerald-400" },
  failed: { dot: "bg-red-400 shadow-red-400/40 shadow-[0_0_6px]", label: "Failed", text: "text-red-400" },
  running: { dot: "bg-brand animate-pulse shadow-brand/40 shadow-[0_0_8px]", label: "Running", text: "text-brand" },
  pending: { dot: "bg-white/25", label: "Pending", text: "text-white/40" },
  cancelled: { dot: "bg-white/20", label: "Cancelled", text: "text-white/30" },
};

export default async function SyncJobsPage() {
  const workspaces = await getUserWorkspaces();
  const wsId = await getCurrentWorkspaceId(workspaces);

  const [jobs, connectors] = await Promise.all([
    wsId ? getSyncJobsByWorkspace(wsId, 50) : Promise.resolve([]),
    wsId ? getConnectorsByWorkspace(wsId) : Promise.resolve([]),
  ]);

  const cMap = Object.fromEntries(connectors.map((c) => [c.id, c]));
  const shaped = jobs.map((j) => {
    const con = cMap[j.connector_id];
    return {
      id: j.id,
      status: j.status as SyncJobStatus,
      name: con?.name ?? "Unknown",
      provider: con?.provider ?? "unknown",
      providerName: formatProvider(con?.provider ?? ""),
      records: j.records_processed ?? 0,
      startedAt: j.started_at,
      completedAt: j.completed_at,
      createdAt: j.created_at,
      dur: duration(j.started_at, j.completed_at),
    };
  });

  // Running jobs bubble to top
  const runningJobs = shaped.filter((j) => j.status === "running" || j.status === "pending");
  const pastJobs = shaped.filter((j) => j.status !== "running" && j.status !== "pending");
  const dayGroups = groupByDay(pastJobs);

  const stats = {
    total: shaped.length,
    completed: shaped.filter((j) => j.status === "completed").length,
    failed: shaped.filter((j) => j.status === "failed").length,
    running: runningJobs.length,
    totalRows: shaped.filter((j) => j.status === "completed").reduce((s, j) => s + j.records, 0),
  };

  return (
    <div className="min-h-full px-6 py-10 sm:px-8 lg:px-12 xl:px-16">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Pipeline
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sync history</h1>
        <p className="mt-1 text-sm text-white/30">
          {stats.totalRows.toLocaleString()} rows synced · {stats.completed} completed · {stats.failed} failed
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total runs", value: stats.total },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Failed", value: stats.failed, color: stats.failed > 0 ? "text-red-400" : undefined },
          { label: "Rows synced", value: stats.totalRows.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">{s.label}</p>
            <p className={cn("mt-1.5 font-mono text-2xl font-semibold tabular-nums", s.color ?? "text-foreground/80")}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-base font-medium text-foreground/60">No sync jobs yet</p>
          <p className="mt-1 text-sm text-white/30">Jobs appear here once connectors run their first sync.</p>
        </div>
      ) : (
        <div>
          {/* Live / running jobs */}
          {runningJobs.length > 0 && (
            <div className="mb-8">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand/60">
                ● Live
              </p>
              <div className="space-y-3">
                {runningJobs.map((job) => {
                  const BrandIcon = BRAND_ICON_MAP[job.provider];
                  const cfg = STATUS_CONFIG[job.status];
                  return (
                    <div key={job.id} className="flex items-center gap-4 rounded-xl border border-brand/15 bg-brand/[0.04] px-5 py-4">
                      <div className={cn("h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
                      {BrandIcon ? <BrandIcon className="h-6 w-6 shrink-0 opacity-80" /> : <GenericPlatformIcon className="h-6 w-6 shrink-0 opacity-80" label={job.providerName} />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{job.name}</p>
                        <p className="text-xs text-white/35">{job.providerName} · started {relativeTime(job.createdAt)}</p>
                      </div>
                      <span className={cn("text-xs font-medium", cfg.text)}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline by day */}
          {Object.entries(dayGroups).map(([day, indices]) => (
            <div key={day} className="mb-8">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
                {day}
              </p>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-[8px] top-3 bottom-3 w-px bg-white/[0.06]" />

                <div className="space-y-0">
                  {indices.map((idx, localI) => {
                    const job = pastJobs[idx];
                    const cfg = STATUS_CONFIG[job.status];
                    const BrandIcon = BRAND_ICON_MAP[job.provider];

                    return (
                      <div
                        key={job.id}
                        className={cn(
                          "flex items-start gap-4 py-4 pl-8",
                          localI < indices.length - 1 && "border-b border-white/[0.035]"
                        )}
                      >
                        {/* Timeline dot */}
                        <div className={cn("absolute left-[5px] mt-1 h-2 w-2 shrink-0 rounded-full ring-2 ring-background", cfg.dot)} />

                        {/* Brand icon */}
                        <div className="shrink-0 pt-0.5">
                          {BrandIcon ? (
                            <BrandIcon className="h-6 w-6 opacity-75" />
                          ) : (
                            <GenericPlatformIcon className="h-6 w-6 opacity-75" label={job.providerName} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="text-[13px] font-medium text-foreground/85">{job.name}</p>
                            <span className={cn("text-[11px] font-medium", cfg.text)}>{cfg.label}</span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-white/28">
                            <span>{job.providerName}</span>
                            {job.records > 0 && (
                              <span className="font-mono">{job.records.toLocaleString()} rows</span>
                            )}
                            {job.dur && <span>{job.dur}</span>}
                          </div>
                        </div>

                        {/* Time */}
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/20">
                          {relativeTime(job.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
