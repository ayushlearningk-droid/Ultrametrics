import Link from "next/link";
import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { getDashboardContext } from "@/lib/data/workspaces";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { MetricsRow } from "@/components/os/metrics-row";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import type { SyncJobStatus, ConnectorStatus } from "@/types/database";
import type { ConnectorTokenHealth } from "@/components/dashboard/connector-health-panel";
import type { MetaConnectorConfig } from "@/lib/meta/token";
import { cn } from "@/lib/utils";

export const metadata = { title: "Overview" };

function resolveTokenHealth(provider: string, status: string, config: unknown): ConnectorTokenHealth {
  if (status !== "active") return "ok";
  if (provider === "meta_ads") {
    const c = (config ?? {}) as MetaConnectorConfig;
    if (!c.access_token) return "missing";
    if (c.token_expires_at && new Date(c.token_expires_at) <= new Date()) return "expired";
    return "ok";
  }
  return "ok";
}

function formatProvider(provider: string): string {
  const found = CONNECTOR_PROVIDERS.find((p) => p.id === provider);
  return found?.name ?? provider.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const STATUS_DOT: Record<SyncJobStatus, string> = {
  completed: "bg-emerald-400",
  failed: "bg-red-400",
  running: "bg-brand animate-pulse",
  pending: "bg-white/20",
  cancelled: "bg-white/20",
};

const CONNECTOR_STATUS_DOT: Record<ConnectorStatus, string> = {
  active: "bg-emerald-400",
  paused: "bg-amber-400",
  error: "bg-red-400",
  disconnected: "bg-white/20",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
      {children}
    </p>
  );
}

function HRule() {
  return <div className="my-10 h-px bg-white/[0.05]" />;
}

export default async function DashboardPage() {
  const context = await getDashboardContext();
  const profile = context?.profile ?? null;
  const workspaces = context?.workspaces ?? [];
  const currentWorkspaceId = context?.currentWorkspaceId ?? null;
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const workspaceName = currentWorkspace?.name ?? "Workspace";

  const [allJobs, connectors] = await Promise.all([
    currentWorkspaceId ? getSyncJobsByWorkspace(currentWorkspaceId, 50) : Promise.resolve([]),
    currentWorkspaceId ? getConnectorsByWorkspace(currentWorkspaceId) : Promise.resolve([]),
  ]);

  const activeConnectors = connectors.filter((c) => c.status === "active");
  const lastSyncAt = allJobs.find((j) => j.status === "completed")?.created_at ?? null;

  const connectorMap = Object.fromEntries(connectors.map((c) => [c.id, c]));

  const recentJobs = allJobs.slice(0, 10).map((job) => {
    const connector = connectorMap[job.connector_id];
    return {
      id: job.id,
      status: job.status as SyncJobStatus,
      connectorName: connector?.name ?? "Unknown",
      providerName: formatProvider(connector?.provider ?? ""),
      provider: connector?.provider ?? "unknown",
      records: job.records_processed ?? 0,
      createdAt: job.created_at,
    };
  });

  const connectorItems = connectors.map((connector) => {
    const providerInfo = CONNECTOR_PROVIDERS.find((p) => p.id === connector.provider);
    const tokenHealth = resolveTokenHealth(connector.provider, connector.status, connector.config);
    const needsReconnect = tokenHealth !== "ok";
    return {
      id: connector.id,
      name: connector.name,
      provider: connector.provider,
      providerName: providerInfo?.name ?? formatProvider(connector.provider),
      connectorStatus: connector.status as ConnectorStatus,
      needsReconnect,
      reconnectHref: providerInfo?.href,
      lastSyncedAt: connector.last_synced_at,
    };
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? null;
  const greeting = getGreeting();

  return (
    <div className="min-h-full px-8 py-10 lg:px-14 xl:px-20">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-1.5 text-sm text-white/35">
          {workspaceName}
          {activeConnectors.length > 0 && (
            <> · <span className="text-emerald-400/70">{activeConnectors.length} source{activeConnectors.length > 1 ? "s" : ""} active</span></>
          )}
          {lastSyncAt && <> · last sync {relativeTime(lastSyncAt)}</>}
        </p>
      </div>

      {/* ── Performance metrics ─────────────────────────── */}
      <section>
        <SectionLabel>Performance · last 30 days</SectionLabel>
        <MetricsRow />
      </section>

      <HRule />

      {/* ── Activity + Sources ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_260px]">

        {/* Activity feed */}
        <section>
          <div className="flex items-center justify-between">
            <SectionLabel>Activity</SectionLabel>
            <Link
              href="/dashboard/sync-jobs"
              className="mb-5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/20 transition-colors hover:text-white/50"
            >
              All jobs →
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="flex h-20 items-center">
              <p className="text-sm text-white/25">No activity yet. Run a sync to get started.</p>
            </div>
          ) : (
            <div>
              {recentJobs.map((job, i) => {
                const BrandIcon = BRAND_ICON_MAP[job.provider];
                return (
                  <div
                    key={job.id}
                    className={cn(
                      "flex items-center gap-4 py-3.5",
                      i < recentJobs.length - 1 && "border-b border-white/[0.04]"
                    )}
                  >
                    {/* Status dot */}
                    <div className={cn("h-[7px] w-[7px] shrink-0 rounded-full", STATUS_DOT[job.status] ?? "bg-white/20")} />

                    {/* Icon */}
                    <div className="shrink-0">
                      {BrandIcon ? (
                        <BrandIcon className="h-6 w-6 opacity-80" />
                      ) : (
                        <GenericPlatformIcon className="h-6 w-6 opacity-80" label={job.providerName} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground/90">
                        {job.connectorName}
                        {job.status === "completed" && job.records > 0 && (
                          <span className="ml-2 font-mono text-xs text-white/35">
                            {job.records.toLocaleString()} rows
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/30">
                        {job.providerName} · {job.status}
                      </p>
                    </div>

                    {/* Time */}
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/20">
                      {relativeTime(job.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sources panel */}
        <section>
          <div className="flex items-center justify-between">
            <SectionLabel>Sources</SectionLabel>
            <Link
              href="/dashboard/connectors"
              className="mb-5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/20 transition-colors hover:text-white/50"
            >
              Manage →
            </Link>
          </div>

          {connectorItems.length === 0 ? (
            <div className="flex h-20 items-center">
              <Link
                href="/dashboard/connectors"
                className="text-sm text-brand/70 transition-colors hover:text-brand"
              >
                + Connect your first source
              </Link>
            </div>
          ) : (
            <div>
              {connectorItems.map((c, i) => {
                const BrandIcon = BRAND_ICON_MAP[c.provider];
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-3 py-3.5",
                      i < connectorItems.length - 1 && "border-b border-white/[0.04]"
                    )}
                  >
                    <div className="shrink-0">
                      {BrandIcon ? (
                        <BrandIcon className="h-6 w-6 opacity-80" />
                      ) : (
                        <GenericPlatformIcon className="h-6 w-6 opacity-80" label={c.providerName} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground/90">{c.name}</p>
                      <p className="text-[11px] text-white/30">
                        {c.needsReconnect ? (
                          <Link href={c.reconnectHref ?? "/dashboard/connectors"} className="text-red-400/70 hover:text-red-400">
                            Needs reconnect
                          </Link>
                        ) : (
                          relativeTime(c.lastSyncedAt)
                        )}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "h-[7px] w-[7px] shrink-0 rounded-full",
                        c.needsReconnect ? "bg-red-400" : CONNECTOR_STATUS_DOT[c.connectorStatus] ?? "bg-white/20"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <HRule />

      {/* ── Quick commands ──────────────────────────────── */}
      <section>
        <SectionLabel>Quick actions</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/connectors"
            className="rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm text-white/50 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white/90"
          >
            + Add connector
          </Link>
          <Link
            href="/dashboard/sync-jobs"
            className="rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm text-white/50 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white/90"
          >
            View sync history
          </Link>
          <button
            className="rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm text-white/50 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white/90"
            onClick={undefined}
          >
            ⌘K  Command palette
          </button>
        </div>
      </section>
    </div>
  );
}
