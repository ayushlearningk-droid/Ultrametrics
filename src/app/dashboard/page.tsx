import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { WelcomeBar } from "@/components/dashboard/welcome-bar";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { PipelineActivity } from "@/components/dashboard/pipeline-activity";
import { ConnectorHealthPanel } from "@/components/dashboard/connector-health-panel";
import { SpendByPlatform } from "@/components/dashboard/spend-by-platform";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SyncActivityChart } from "@/components/dashboard/sync-activity-chart";
import type { SyncJobStatus, ConnectorStatus } from "@/types/database";
import { getDashboardContext } from "@/lib/data/workspaces";
import type { ConnectorTokenHealth } from "@/components/dashboard/connector-health-panel";
import type { MetaConnectorConfig } from "@/lib/meta/token";

export const metadata = {
  title: "Overview",
};

function resolveTokenHealth(
  provider: string,
  status: string,
  config: unknown
): ConnectorTokenHealth {
  if (status !== "active") return "ok";

  if (provider === "meta_ads") {
    const c = (config ?? {}) as MetaConnectorConfig;
    if (!c.access_token) return "missing";
    if (c.token_expires_at && new Date(c.token_expires_at) <= new Date()) {
      return "expired";
    }
    return "ok";
  }

  return "ok";
}

function formatProvider(provider: string): string {
  const found = CONNECTOR_PROVIDERS.find((p) => p.id === provider);
  if (found) return found.name;
  return provider.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function DashboardPage() {
  const context = await getDashboardContext();
  const profile = context?.profile ?? null;
  const workspaces = context?.workspaces ?? [];
  const currentWorkspaceId = context?.currentWorkspaceId ?? null;
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const workspaceName = currentWorkspace?.name ?? "Workspace";

  const [allJobs, connectors] = await Promise.all([
    currentWorkspaceId ? getSyncJobsByWorkspace(currentWorkspaceId, 100) : Promise.resolve([]),
    currentWorkspaceId ? getConnectorsByWorkspace(currentWorkspaceId) : Promise.resolve([]),
  ]);

  // Zone A data
  const activeConnectors = connectors.filter((c) => c.status === "active");
  const recentSyncs = allJobs.filter((j) => j.status === "completed").slice(0, 10);

  // Pipeline jobs timeline (last 8)
  const connectorMap = Object.fromEntries(connectors.map((c) => [c.id, c]));
  const pipelineJobs = allJobs.slice(0, 8).map((job) => {
    const connector = connectorMap[job.connector_id];
    return {
      id: job.id,
      status: job.status as SyncJobStatus,
      connectorName: connector?.name ?? "Unknown",
      providerName: formatProvider(connector?.provider ?? ""),
      records: job.records_processed ?? 0,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    };
  });

  // Connector health items
  const connectorHealthItems = connectors.map((connector) => {
    const providerInfo = CONNECTOR_PROVIDERS.find((p) => p.id === connector.provider);
    const connectorJobs = allJobs
      .filter((j) => j.connector_id === connector.id && j.status === "completed")
      .slice(0, 7)
      .reverse();

    const tokenHealth = resolveTokenHealth(connector.provider, connector.status, connector.config);

    return {
      id: connector.id,
      name: connector.name,
      provider: connector.provider,
      providerName: providerInfo?.name ?? formatProvider(connector.provider),
      connectorStatus: connector.status as ConnectorStatus,
      tokenHealth,
      gradient: providerInfo?.gradient ?? "from-brand to-brand/60",
      lastSyncedAt: connector.last_synced_at,
      recentRecords: connectorJobs.map((j) => j.records_processed ?? 0),
      reconnectHref: providerInfo?.href,
    };
  });

  // Records by active platform
  const recordsByPlatform = connectors
    .filter((c) => c.status === "active")
    .map((connector) => {
      const providerInfo = CONNECTOR_PROVIDERS.find((p) => p.id === connector.provider);
      const totalRecords = allJobs
        .filter((j) => j.connector_id === connector.id && j.status === "completed")
        .reduce((sum, j) => sum + (j.records_processed ?? 0), 0);
      return {
        provider: connector.provider,
        providerName: providerInfo?.name ?? formatProvider(connector.provider),
        records: totalRecords,
        color: PLATFORM_COLORS[connector.provider] ?? "#4F8BEE",
      };
    })
    .sort((a, b) => b.records - a.records);

  // Daily sync activity for activity chart (last 14 days)
  const dailySyncData = buildDailySyncData(allJobs, 14);

  return (
    <div className="relative min-h-full">
      {/* Aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-[600px] w-[600px] opacity-[0.06]"
          style={{ background: "radial-gradient(circle at center, hsl(221 83% 60%), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] opacity-[0.04]"
          style={{ background: "radial-gradient(circle at center, hsl(280 65% 60%), transparent 70%)" }}
        />
      </div>

      <div className="relative space-y-5 pb-8">
        {/* Zone A — Welcome Bar */}
        <WelcomeBar
          userName={profile?.full_name ?? null}
          workspaceName={workspaceName}
          activeSourcesCount={activeConnectors.length}
          recentSyncsCount={recentSyncs.length}
        />

        {/* Zone B — Metric Grid */}
        <MetricGrid />

        {/* Zone B2 — Sync Activity Chart */}
        {dailySyncData.length >= 2 && (
          <SyncActivityChart data={dailySyncData} />
        )}

        {/* Zone C — Pipeline + Health */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PipelineActivity jobs={pipelineJobs} />
          <ConnectorHealthPanel connectors={connectorHealthItems} />
        </div>

        {/* Zone D — Records by Platform + Quick Actions */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SpendByPlatform data={recordsByPlatform} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

function buildDailySyncData(
  jobs: { created_at: string; records_processed?: number | null; status: string }[],
  days: number
): { label: string; value: number }[] {
  const now = new Date();
  const buckets: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }

  for (const job of jobs) {
    if (job.status !== "completed") continue;
    const key = job.created_at.slice(0, 10);
    if (key in buckets) {
      buckets[key] += job.records_processed ?? 0;
    }
  }

  return Object.entries(buckets).map(([date, value]) => ({
    label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value,
  }));
}

const PLATFORM_COLORS: Record<string, string> = {
  meta_ads: "#4F8BEE",
  google_ads: "#34A853",
  google_sheets: "#0F9D58",
  ga4: "#E37400",
  shopify: "#5E8E3E",
  tiktok_ads: "#010101",
  amazon_ads: "#FF9900",
};
