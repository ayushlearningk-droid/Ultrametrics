"use client";

import { Database, FileSpreadsheet, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";
import type { SyncJobStatus } from "@/types/database";

/* ── types ───────────────────────────────────────────────────────── */

interface Job {
  id: string;
  status: SyncJobStatus;
  name: string;
  provider: string;
  providerName: string;
  records: number;
  createdAt: string;
  durationMs: number | null;
  error: string | null;
}

interface Lane {
  provider: string;
  name: string;
  providerName: string;
  status: string;
  lastStatus: SyncJobStatus | null;
  lastSync: string | null;
  lastRows: number;
}

interface Schedule {
  frequency: string;
  enabled: boolean;
  nextRunAt: string | null;
  isExample?: boolean;
}

interface Summary {
  activeSources: number;
  destinations: number;
  lastSuccess: string | null;
  totalRows: number;
  completed: number;
  failed: number;
}

/* ── helpers ─────────────────────────────────────────────────────── */

function relativeTime(d: string | null) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDuration(ms: number | null) {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function nextRunLabel(s: Schedule | null) {
  if (!s) return "Not scheduled";
  if (s.nextRunAt) {
    const diff = new Date(s.nextRunAt).getTime() - Date.now();
    if (diff <= 0) return "Due now";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h >= 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
    if (h >= 1) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }
  return s.frequency === "hourly" ? "within the hour" : s.frequency === "weekly" ? "this week" : "today";
}

const STATUS: Record<
  SyncJobStatus,
  { tone: string; dot: string; label: string; Icon: React.ElementType }
> = {
  completed: { tone: "text-brand", dot: "bg-brand shadow-[0_0_6px_1px] shadow-brand/40", label: "Completed", Icon: CheckCircle2 },
  failed: { tone: "text-danger", dot: "bg-danger shadow-[0_0_6px_1px] shadow-danger/40", label: "Failed", Icon: XCircle },
  running: { tone: "text-brand", dot: "bg-brand anim-pulse shadow-[0_0_8px_2px] shadow-brand/50", label: "Running", Icon: Loader2 },
  pending: { tone: "text-foreground-muted", dot: "bg-foreground-muted/40", label: "Queued", Icon: Clock },
  cancelled: { tone: "text-foreground-muted/60", dot: "bg-foreground-muted/30", label: "Cancelled", Icon: XCircle },
};

/* ── flow lane (ROW 2) ───────────────────────────────────────────── */

function FlowNode({
  children,
  label,
  active,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl border",
          active
            ? "border-brand/30 bg-brand/[0.08] text-brand"
            : "border-white/[0.1] bg-white/[0.03] text-foreground-muted"
        )}
      >
        {children}
      </div>
      <span className="type-caption text-foreground-muted/70">{label}</span>
    </div>
  );
}

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="relative mx-1 mb-6 mt-6 h-[2px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
      {active ? (
        <>
          {/* steady base line */}
          <div className="absolute inset-0 bg-brand/20" />
          {/* traveling pulse */}
          <div className="anim-flow absolute inset-0" />
        </>
      ) : (
        <div className="absolute inset-0 bg-white/[0.04]" />
      )}
    </div>
  );
}

function Lane({ lane }: { lane: Lane }) {
  const BrandIcon = BRAND_ICON_MAP[lane.provider];
  const active = lane.status === "active";
  const flowing = active && lane.lastStatus !== "failed";
  return (
    <div className="panel panel-hover p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {BrandIcon ? (
            <BrandIcon className="h-5 w-5 opacity-85" />
          ) : (
            <GenericPlatformIcon className="h-5 w-5 opacity-85" label={lane.providerName} />
          )}
          <span className="type-body font-medium text-foreground/88">{lane.providerName}</span>
        </div>
        <span className="relative flex h-2 w-2 items-center justify-center">
          {active && <span className="anim-pulse absolute inline-flex h-2 w-2 rounded-full bg-brand/50" />}
          <span
            className={cn(
              "relative inline-flex h-[5px] w-[5px] rounded-full",
              lane.lastStatus === "failed" ? "bg-danger" : active ? "bg-brand" : "bg-foreground-muted/40"
            )}
          />
        </span>
      </div>

      {/* source → normalize → sheets */}
      <div className="flex items-start justify-between">
        <FlowNode label="Source" active={active}>
          {BrandIcon ? <BrandIcon className="h-5 w-5" /> : <Database className="h-4 w-4" />}
        </FlowNode>
        <FlowConnector active={flowing} />
        <FlowNode label="Normalize" active={active}>
          <Database className="h-4 w-4" />
        </FlowNode>
        <FlowConnector active={flowing} />
        <FlowNode label="Sheets" active={active}>
          <FileSpreadsheet className="h-4 w-4" />
        </FlowNode>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <span className="type-caption text-foreground-muted/60">
          {lane.lastSync ? `Last sync ${relativeTime(lane.lastSync)}` : "Not yet synced"}
        </span>
        {lane.lastRows > 0 && (
          <span className="font-mono type-caption tabular-nums text-foreground-muted">
            {lane.lastRows.toLocaleString()} rows
          </span>
        )}
      </div>
    </div>
  );
}

/* ── main ────────────────────────────────────────────────────────── */

export function PipelineView({
  jobs,
  lanes,
  schedule,
  summary,
  isExample,
}: {
  jobs: Job[];
  lanes: Lane[];
  schedule: Schedule | null;
  summary: Summary;
  isExample: boolean;
}) {
  const anyRunning = jobs.some((j) => j.status === "running" || j.status === "pending");
  const showDuration = jobs.some((j) => j.durationMs != null);

  return (
    <div className="min-h-full px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
      <div className="space-y-6 anim-settle">

        {/* ═══ ROW 1 · Pipeline status hero (L3) ═══════════════════ */}
        <div className="surface-elevated relative overflow-hidden p-7 sm:p-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="anim-pulse absolute inline-flex h-3 w-3 rounded-full bg-brand/40" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-brand shadow-[0_0_8px_2px] shadow-brand/50" />
            </span>
            <span className="type-eyebrow text-foreground-muted">
              {schedule?.enabled !== false ? "Pipeline active" : "Pipeline paused"}
            </span>
            {isExample && (
              <span className="rounded-full border border-white/[0.12] bg-white/[0.03] px-2.5 py-0.5 type-caption text-foreground-muted">
                Example
              </span>
            )}
          </div>

          <h1 className="mt-4 type-display max-w-2xl text-balance">
            {anyRunning
              ? "Syncing your marketing data now"
              : summary.activeSources > 0
              ? "Your marketing data is flowing on schedule"
              : "Connect a source to start the pipeline"}
          </h1>

          {/* hero metrics */}
          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.04] sm:grid-cols-4">
            {[
              { label: "Next sync", value: nextRunLabel(schedule) },
              { label: "Last success", value: relativeTime(summary.lastSuccess) },
              { label: "Active sources", value: String(summary.activeSources) },
              { label: "Destinations", value: String(summary.destinations) },
            ].map((m) => (
              <div key={m.label} className="bg-surface-1/70 px-5 py-4">
                <p className="type-caption text-foreground-muted/60">{m.label}</p>
                <p className="mt-1 type-body font-medium text-foreground/88">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ ROW 2 · Visual data flow ════════════════════════════ */}
        <div>
          <p className="mb-3 type-eyebrow text-foreground-muted/80">Data flow</p>
          {lanes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {lanes.map((lane) => (
                <Lane key={lane.provider} lane={lane} />
              ))}
            </div>
          ) : (
            <div className="panel p-8 text-center">
              <p className="type-body text-foreground-muted">
                No source pipelines yet. Connect Meta Ads or Google Ads to see data flow here.
              </p>
            </div>
          )}
        </div>

        {/* ═══ ROW 3 · Recent runs timeline ════════════════════════ */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="type-eyebrow text-foreground-muted/80">Recent runs</p>
            <span className="font-mono type-caption tabular-nums text-foreground-muted/45">
              {summary.completed} completed · {summary.failed} failed
            </span>
          </div>
          <div className="panel overflow-hidden">
            {jobs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="type-body text-foreground-muted">
                  Runs appear here after your first sync.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute bottom-5 left-[26px] top-5 w-px bg-white/[0.06]" />
                {jobs.slice(0, 12).map((job, i) => {
                  const st = STATUS[job.status];
                  const BrandIcon = BRAND_ICON_MAP[job.provider];
                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]",
                        i < Math.min(jobs.length, 12) - 1 && "border-b border-white/[0.04]"
                      )}
                    >
                      {/* timeline dot */}
                      <span
                        className={cn(
                          "relative z-[1] flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-4 ring-[hsl(var(--surface-1))]",
                          st.dot
                        )}
                      />
                      {/* brand */}
                      <div className="shrink-0">
                        {BrandIcon ? (
                          <BrandIcon className="h-5 w-5 opacity-80" />
                        ) : (
                          <GenericPlatformIcon className="h-5 w-5 opacity-80" label={job.providerName} />
                        )}
                      </div>
                      {/* name + status */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2.5">
                          <p className="type-body font-medium text-foreground/88">{job.name}</p>
                          <span className={cn("type-caption font-medium", st.tone)}>{st.label}</span>
                        </div>
                        <p className="mt-0.5 type-caption text-foreground-muted/60">
                          {job.providerName}
                          {job.error && <span className="text-danger/70"> · {job.error}</span>}
                        </p>
                      </div>
                      {/* records */}
                      <div className="hidden w-24 text-right sm:block">
                        {job.records > 0 ? (
                          <>
                            <p className="font-mono type-body tabular-nums text-foreground/80">
                              {job.records.toLocaleString()}
                            </p>
                            <p className="type-caption text-foreground-muted/50">rows</p>
                          </>
                        ) : (
                          <p className="type-caption text-foreground-muted/40">—</p>
                        )}
                      </div>
                      {/* duration */}
                      {showDuration && (
                        <div className="hidden w-16 text-right md:block">
                          <p className="font-mono type-caption tabular-nums text-foreground-muted/60">
                            {fmtDuration(job.durationMs) ?? "—"}
                          </p>
                        </div>
                      )}
                      {/* time */}
                      <span className="w-16 shrink-0 text-right font-mono type-caption tabular-nums text-foreground-muted/45">
                        {relativeTime(job.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ ROW 4 + 5 · Destination health · Scheduler ══════════ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Destination health */}
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-foreground-muted/70" />
              <p className="type-eyebrow text-foreground-muted/80">Destination health</p>
            </div>
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-5 w-5 text-foreground-muted" />
                  <span className="type-body font-medium text-foreground/88">Google Sheets</span>
                </div>
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-[6px] w-[6px] rounded-full",
                      summary.failed === 0
                        ? "bg-brand shadow-[0_0_6px_1px] shadow-brand/40"
                        : "bg-warn"
                    )}
                  />
                  <span className={cn("type-caption font-medium", summary.failed === 0 ? "text-brand" : "text-warn")}>
                    {summary.failed === 0 ? "Healthy" : "Degraded"}
                  </span>
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 divide-x divide-white/[0.05] border-t border-white/[0.05] pt-4">
                <div className="pr-4">
                  <p className="type-caption text-foreground-muted/60">Last update</p>
                  <p className="mt-1 type-body text-foreground/80">{relativeTime(summary.lastSuccess)}</p>
                </div>
                <div className="pl-4">
                  <p className="type-caption text-foreground-muted/60">Rows written</p>
                  <p className="mt-1 font-mono type-body tabular-nums text-foreground/80">
                    {summary.totalRows.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduler status */}
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Clock className="h-3.5 w-3.5 text-foreground-muted/70" />
              <p className="type-eyebrow text-foreground-muted/80">Scheduler</p>
              {schedule?.isExample && (
                <span className="rounded-full border border-white/[0.12] bg-white/[0.03] px-2 py-0.5 type-caption text-foreground-muted">
                  Example
                </span>
              )}
            </div>
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="type-body font-medium text-foreground/88">
                  {schedule
                    ? schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)
                    : "Not configured"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-[6px] w-[6px] rounded-full",
                      schedule?.enabled
                        ? "bg-brand shadow-[0_0_6px_1px] shadow-brand/40"
                        : "bg-foreground-muted/40"
                    )}
                  />
                  <span className={cn("type-caption font-medium", schedule?.enabled ? "text-brand" : "text-foreground-muted")}>
                    {schedule?.enabled ? "Enabled" : "Disabled"}
                  </span>
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 divide-x divide-white/[0.05] border-t border-white/[0.05] pt-4">
                <div className="pr-4">
                  <p className="type-caption text-foreground-muted/60">Next run</p>
                  <p className="mt-1 type-body text-foreground/80">{nextRunLabel(schedule)}</p>
                </div>
                <div className="pl-4">
                  <p className="type-caption text-foreground-muted/60">Frequency</p>
                  <p className="mt-1 type-body text-foreground/80 capitalize">
                    {schedule?.frequency ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
