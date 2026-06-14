import Link from "next/link";
import { cookies } from "next/headers";
import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { getDashboardContext } from "@/lib/data/workspaces";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { AIHero } from "@/components/home/ai-hero";
import { CampaignHealthStrip } from "@/components/home/campaign-health-strip";
import type { HealthConnector } from "@/components/home/campaign-health-strip";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import type { SyncJobStatus, ConnectorStatus } from "@/types/database";
import type { MetaConnectorConfig } from "@/lib/meta/token";
import { DEMO_CONNECTORS, DEMO_SYNC_JOBS } from "@/lib/dev/demo-data";
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

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("__dev_screenshot")?.value === "1";

  const ctx = await getDashboardContext();
  const profile = ctx?.profile ?? null;
  const workspaces = ctx?.workspaces ?? [];
  const wsId = ctx?.currentWorkspaceId ?? null;
  const wsName =
    workspaces.find((w) => w.id === wsId)?.name ?? (isDemo ? "Acme Corp" : "Workspace");

  const [allJobs, connectors] = isDemo
    ? [DEMO_SYNC_JOBS, DEMO_CONNECTORS]
    : await Promise.all([
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

      <div className="relative px-6 pb-8 pt-8 sm:px-8 lg:px-12 xl:px-14">

        {/* ── Workspace + greeting eyebrow (single line, no duplicate status) ── */}
        <div className="mb-5 flex items-baseline gap-2.5">
          <span className="type-eyebrow text-foreground-muted/80">{wsName}</span>
          <span className="text-foreground-muted/30">·</span>
          <span className="type-caption text-foreground-muted/70">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ""}
          </span>
        </div>

        {/* ── AI Hero (L3) — dominates the first viewport ─────────── */}
        <section className="mb-8">
          <AIHero
            connectors={digestConnectors}
            activeCount={activeConnectors.length}
            lastSync={lastSync ? `synced ${relativeTime(lastSync)}` : null}
          />
        </section>

        {/* ── Campaign Health Strip ────────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="type-eyebrow text-foreground-muted/80">
              Campaign Health · Last 7 days
            </p>
            {connectorCards.length > 0 && (
              <Link
                href="/dashboard/connectors"
                className="type-caption font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                Manage →
              </Link>
            )}
          </div>
          <CampaignHealthStrip connectors={connectorCards} />
        </section>

        {/* ── ROW 5 · Sources ──────────────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="type-eyebrow text-foreground-muted/80">Sources</p>
            <Link
              href="/dashboard/connectors"
              className="type-caption font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              Manage →
            </Link>
          </div>

          {sourceItems.length === 0 ? (
            <Link
              href="/dashboard/connectors"
              className="panel panel-hover block px-5 py-6 text-center type-body text-brand/80 transition-colors hover:text-brand"
            >
              + Connect your first data source
            </Link>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sourceItems.map((s) => {
                const BrandIcon = BRAND_ICON_MAP[s.provider];
                const statusLabel = s.warn
                  ? "Reconnect"
                  : s.status === "active"
                  ? "Live"
                  : s.status === "paused"
                  ? "Paused"
                  : "Offline";
                const statusTone = s.warn
                  ? "border-danger/30 bg-danger/[0.08] text-danger"
                  : s.status === "active"
                  ? "border-brand/30 bg-brand/[0.08] text-brand"
                  : s.status === "paused"
                  ? "border-warn/30 bg-warn/[0.08] text-warn"
                  : "border-white/[0.1] bg-white/[0.03] text-foreground-muted";
                return (
                  <Link
                    key={s.id}
                    href={
                      s.reconnectHref ??
                      `/dashboard/connectors/${s.provider.replace(/_/g, "-")}`
                    }
                    className="panel panel-hover group flex flex-col p-4"
                  >
                    {/* header: brand + status pill */}
                    <div className="flex items-center gap-3">
                      {BrandIcon ? (
                        <BrandIcon className="h-8 w-8 shrink-0 opacity-95" />
                      ) : (
                        <GenericPlatformIcon
                          className="h-8 w-8 shrink-0 opacity-95"
                          label={s.providerName}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate type-body font-medium text-foreground/90">
                          {s.providerName}
                        </p>
                        <p className="mt-0.5 type-caption text-foreground-muted/55">
                          {s.warn ? "Token expired" : relativeTime(s.lastSync)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 type-caption font-medium",
                          statusTone
                        )}
                      >
                        <span className="relative flex h-2 w-2 items-center justify-center">
                          {s.status === "active" && !s.warn && (
                            <span className="anim-pulse absolute inline-flex h-2 w-2 rounded-full bg-brand/50" />
                          )}
                          <span
                            className={cn(
                              "relative inline-flex h-[5px] w-[5px] rounded-full",
                              s.warn
                                ? "bg-danger"
                                : s.status === "active"
                                ? "bg-brand"
                                : s.status === "paused"
                                ? "bg-warn"
                                : "bg-foreground-muted/40"
                            )}
                          />
                        </span>
                        {statusLabel}
                      </span>
                    </div>

                    {/* footer: health + destination */}
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
                      <span className="type-caption text-foreground-muted/55">
                        {s.warn ? "Action needed" : "Syncing to Sheets"}
                      </span>
                      <span className="type-caption text-foreground-muted/45 transition-colors group-hover:text-foreground-muted">
                        {s.warn ? "Reconnect →" : "View →"}
                      </span>
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/dashboard/connectors"
                className="flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-white/[0.08] p-4 type-caption text-foreground-muted/60 transition-colors hover:border-white/[0.18] hover:text-foreground"
              >
                + Add source
              </Link>
            </div>
          )}
        </section>

        {/* ── ROW 6 · Activity timeline ────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="type-eyebrow text-foreground-muted/80">Activity timeline</p>
            <Link
              href="/dashboard/sync-jobs"
              className="type-caption font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              Full history →
            </Link>
          </div>

          <div className="panel overflow-hidden">
            {recentJobs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <p className="type-body text-foreground-muted">No pipeline activity yet.</p>
                <Link
                  href="/dashboard/connectors"
                  className="type-body text-brand/80 transition-colors hover:text-brand"
                >
                  Connect a source to start syncing →
                </Link>
              </div>
            ) : (
              <div className="relative">
                {/* continuous timeline guide with a subtle downward flow */}
                <div className="absolute bottom-6 left-[34px] top-6 w-px overflow-hidden bg-white/[0.06]">
                  <div className="anim-flow-y absolute inset-x-0 h-16" />
                </div>
                {recentJobs.map((job, i) => {
                  const BrandIcon = BRAND_ICON_MAP[job.provider];
                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]",
                        i < recentJobs.length - 1 && "border-b border-white/[0.04]"
                      )}
                    >
                      <span
                        className={cn(
                          "relative z-[1] flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-4 ring-[hsl(var(--surface-1))]",
                          job.status === "completed"
                            ? "bg-brand shadow-[0_0_6px_1px] shadow-brand/40"
                            : job.status === "failed"
                            ? "bg-danger shadow-[0_0_6px_1px] shadow-danger/40"
                            : job.status === "running"
                            ? "bg-brand anim-pulse"
                            : "bg-foreground-muted/30"
                        )}
                      />
                      <div className="shrink-0">
                        {BrandIcon ? (
                          <BrandIcon className="h-5 w-5 opacity-75" />
                        ) : (
                          <GenericPlatformIcon
                            className="h-5 w-5 opacity-75"
                            label={job.providerName}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="type-body text-foreground/85">
                          {job.connectorName}
                          {job.status === "running" && (
                            <span className="ml-2 text-brand/70">syncing…</span>
                          )}
                          {job.status === "failed" && (
                            <span className="ml-2 type-caption text-danger/80">failed</span>
                          )}
                        </p>
                        <p className="mt-0.5 type-caption text-foreground-muted/60">
                          {job.providerName}
                        </p>
                      </div>
                      {job.status === "completed" && job.records > 0 && (
                        <span className="hidden font-mono type-caption tabular-nums text-foreground-muted/55 sm:block">
                          {job.records.toLocaleString()} rows
                        </span>
                      )}
                      <span className="shrink-0 font-mono type-caption tabular-nums text-foreground-muted/45">
                        {relativeTime(job.at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
