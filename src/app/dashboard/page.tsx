import Link from "next/link";
import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { getDashboardContext } from "@/lib/data/workspaces";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { AIDigest } from "@/components/home/ai-digest";
import { CampaignHealthStrip } from "@/components/home/campaign-health-strip";
import type { HealthConnector } from "@/components/home/campaign-health-strip";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import type { SyncJobStatus, ConnectorStatus } from "@/types/database";
import type { MetaConnectorConfig } from "@/lib/meta/token";
import { cn } from "@/lib/utils";

export const metadata = { title: "Home" };

function formatProvider(provider: string) {
  return (
    CONNECTOR_PROVIDERS.find((p) => p.id === provider)?.name ??
    provider.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function relativeTime(d: string | null) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function resolveTokenHealth(
  provider: string,
  status: string,
  config: unknown
): boolean {
  if (status !== "active") return false;
  if (provider === "meta_ads") {
    const c = (config ?? {}) as MetaConnectorConfig;
    if (!c.access_token) return true;
    if (c.token_expires_at && new Date(c.token_expires_at) <= new Date())
      return true;
  }
  return false;
}

const JOB_DOT: Record<SyncJobStatus, string> = {
  completed: "bg-emerald-400",
  failed: "bg-red-400",
  running: "bg-brand animate-pulse",
  pending: "bg-white/20",
  cancelled: "bg-white/20",
};

export default async function DashboardPage() {
  const ctx = await getDashboardContext();
  const profile = ctx?.profile ?? null;
  const workspaces = ctx?.workspaces ?? [];
  const wsId = ctx?.currentWorkspaceId ?? null;
  const wsName =
    workspaces.find((w) => w.id === wsId)?.name ?? "Workspace";

  const [allJobs, connectors] = await Promise.all([
    wsId ? getSyncJobsByWorkspace(wsId, 8) : Promise.resolve([]),
    wsId ? getConnectorsByWorkspace(wsId) : Promise.resolve([]),
  ]);

  const activeConnectors = connectors.filter((c) => c.status === "active");
  const lastSync =
    allJobs.find((j) => j.status === "completed")?.created_at ?? null;

  // For AI digest — lightweight connector info
  const digestConnectors = connectors.map((c) => ({
    provider: c.provider,
    status: c.status,
    name: c.name,
  }));

  // For campaign health strip
  const connectorCards: HealthConnector[] = connectors.map((c) => {
    const info = CONNECTOR_PROVIDERS.find((p) => p.id === c.provider);
    return {
      id: c.id,
      provider: c.provider,
      providerName: info?.name ?? formatProvider(c.provider),
      status: c.status as ConnectorStatus,
      lastSync: c.last_synced_at,
      href: info?.href ?? "/dashboard/connectors",
    };
  });

  // For pipeline activity
  const cMap = Object.fromEntries(connectors.map((c) => [c.id, c]));
  const recentJobs = allJobs.map((j) => {
    const con = cMap[j.connector_id];
    return {
      id: j.id,
      status: j.status as SyncJobStatus,
      provider: con?.provider ?? "unknown",
      providerName: formatProvider(con?.provider ?? ""),
      connectorName: con?.name ?? "Unknown source",
      records: j.records_processed ?? 0,
      at: j.created_at,
    };
  });

  // For sources list
  const sourceItems = connectors.map((c) => {
    const info = CONNECTOR_PROVIDERS.find((p) => p.id === c.provider);
    const hasTokenIssue = resolveTokenHealth(c.provider, c.status, c.config);
    return {
      id: c.id,
      provider: c.provider,
      providerName: info?.name ?? formatProvider(c.provider),
      status: c.status as ConnectorStatus,
      warn: hasTokenIssue,
      reconnectHref: info?.href,
      lastSync: c.last_synced_at,
    };
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="relative min-h-full">
      {/* Background depth: subtle top-left light source */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 0% 0%, hsl(234 80% 62% / 0.05) 0%, transparent 100%)",
        }}
      />

      <div className="relative px-6 pb-12 pt-10 sm:px-8 lg:px-12 xl:px-16">

        {/* ── Greeting ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
            {wsName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-[13px] text-white/30">
            {activeConnectors.length > 0 ? (
              <>
                {activeConnectors.length} active source
                {activeConnectors.length > 1 ? "s" : ""}
                {lastSync && <> · synced {relativeTime(lastSync)}</>}
              </>
            ) : (
              "No active sources — connect your first data source to get started."
            )}
          </p>
        </div>

        {/* ── AI Digest — first visible ────────────────────────────── */}
        <section className="mb-10">
          <AIDigest connectors={digestConnectors} />
        </section>

        {/* ── Campaign Health Strip ────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
              Campaign Health · Last 7 days
            </p>
            {connectorCards.length > 0 && (
              <Link
                href="/dashboard/connectors"
                className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/20 transition-colors hover:text-white/50"
              >
                Manage →
              </Link>
            )}
          </div>
          <CampaignHealthStrip connectors={connectorCards} />
        </section>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div className="mb-10 h-px bg-white/[0.05]" />

        {/* ── Activity + Sources ───────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px]">

          {/* Pipeline Activity */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                Pipeline Activity
              </p>
              <Link
                href="/dashboard/sync-jobs"
                className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/20 transition-colors hover:text-white/50"
              >
                Full history →
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-white/[0.07] px-5 py-8 text-center">
                <p className="text-[13px] text-white/25">
                  No pipeline activity yet.
                </p>
                <Link
                  href="/dashboard/connectors"
                  className="text-[13px] text-brand/60 transition-colors hover:text-brand"
                >
                  Connect a source to start syncing →
                </Link>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline guide */}
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-white/[0.05]" />

                <div className="space-y-0">
                  {recentJobs.map((job, i) => {
                    const BrandIcon = BRAND_ICON_MAP[job.provider];
                    return (
                      <div
                        key={job.id}
                        className={cn(
                          "flex items-start gap-4 py-3.5 pl-7",
                          i < recentJobs.length - 1 &&
                            "border-b border-white/[0.035]"
                        )}
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute left-[4px] h-[7px] w-[7px] rounded-full ring-2 ring-background",
                            JOB_DOT[job.status]
                          )}
                          style={{ marginTop: `${i * 56 + 20}px` }}
                        />

                        <div className="shrink-0">
                          {BrandIcon ? (
                            <BrandIcon className="h-[20px] w-[20px] opacity-65" />
                          ) : (
                            <GenericPlatformIcon
                              className="h-[20px] w-[20px] opacity-65"
                              label={job.providerName}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-foreground/80">
                            {job.connectorName}
                            {job.status === "running" && (
                              <span className="ml-2 text-brand/70">
                                syncing…
                              </span>
                            )}
                            {job.status === "completed" && job.records > 0 && (
                              <span className="ml-2 font-mono text-[11px] tabular-nums text-white/25">
                                {job.records.toLocaleString()} rows
                              </span>
                            )}
                            {job.status === "failed" && (
                              <span className="ml-2 text-[11px] text-red-400/70">
                                failed
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/25">
                            {job.providerName}
                          </p>
                        </div>

                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/18">
                          {relativeTime(job.at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Sources health */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                Sources
              </p>
              <Link
                href="/dashboard/connectors"
                className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/20 transition-colors hover:text-white/50"
              >
                Manage →
              </Link>
            </div>

            {sourceItems.length === 0 ? (
              <Link
                href="/dashboard/connectors"
                className="block rounded-xl border border-dashed border-white/[0.07] px-4 py-4 text-center text-[13px] text-brand/60 transition-colors hover:border-white/[0.12] hover:text-brand"
              >
                + Connect a data source
              </Link>
            ) : (
              <div className="space-y-0">
                {sourceItems.map((s, i) => {
                  const BrandIcon = BRAND_ICON_MAP[s.provider];
                  return (
                    <Link
                      key={s.id}
                      href={
                        s.reconnectHref ??
                        `/dashboard/connectors/${s.provider.replace(/_/g, "-")}`
                      }
                      className={cn(
                        "flex items-center gap-3 py-3 transition-colors hover:bg-white/[0.02]",
                        i < sourceItems.length - 1 &&
                          "border-b border-white/[0.035]"
                      )}
                    >
                      {BrandIcon ? (
                        <BrandIcon className="h-5 w-5 shrink-0 opacity-75" />
                      ) : (
                        <GenericPlatformIcon
                          className="h-5 w-5 shrink-0 opacity-75"
                          label={s.providerName}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground/80">
                          {s.providerName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/25">
                          {s.warn ? (
                            <span className="text-red-400/70">
                              Needs reconnect
                            </span>
                          ) : (
                            relativeTime(s.lastSync)
                          )}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "h-[6px] w-[6px] shrink-0 rounded-full",
                          s.warn
                            ? "bg-red-400 shadow-[0_0_6px_1px] shadow-red-400/30"
                            : s.status === "active"
                            ? "bg-emerald-400 shadow-[0_0_6px_1px] shadow-emerald-400/30"
                            : s.status === "paused"
                            ? "bg-amber-400"
                            : "bg-white/20"
                        )}
                      />
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Add source CTA */}
            {sourceItems.length > 0 && (
              <Link
                href="/dashboard/connectors"
                className="mt-4 block rounded-xl border border-dashed border-white/[0.06] px-4 py-2.5 text-center text-[12px] text-white/22 transition-colors hover:border-white/[0.12] hover:text-white/50"
              >
                + Add source
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
