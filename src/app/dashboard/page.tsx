import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { WelcomeBar } from "@/components/dashboard/welcome-bar";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { PipelineActivity } from "@/components/dashboard/pipeline-activity";
import { ConnectorHealthPanel } from "@/components/dashboard/connector-health-panel";
import { SpendByPlatform } from "@/components/dashboard/spend-by-platform";
import { QuickActions } from "@/components/dashboard/quick-actions";
import type { SyncJobStatus, ConnectorStatus } from "@/types/database";
import { getDashboardContext } from "@/lib/data/workspaces";
import type { ConnectorTokenHealth } from "@/components/dashboard/connector-health-panel";
import type { MetaConnectorConfig } from "@/lib/meta/token";

export const metadata = {
  title: "Overview",
};

/**
 * Derives token-level health from the connector's stored config.
 * Only Meta Ads currently uses a non-refreshing long-lived token;
 * Google connectors use refresh tokens handled by googleapis automatically.
 */
function resolveTokenHealth(
  provider: string,
  status: string,
  config: unknown
): ConnectorTokenHealth {
  // Non-active connectors: the connector-level status drives the ring.
  if (status !== "active") return "ok";

  if (provider === "meta_ads") {
    const c = (config ?? {}) as MetaConnectorConfig;
    if (!c.access_token) return "missing";
    if (c.token_expires_at && new Date(c.token_expires_at) <= new Date()) {
      return "expired";
    }
    return "ok";
  }

  // Google connectors auto-refresh; treat as ok when active.
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
    currentWorkspaceId ? getSyncJobsByWorkspace(currentWorkspaceId, 50) : Promise.resolve([]),
    currentWorkspaceId ? getConnectorsByWorkspace(currentWorkspaceId) : Promise.resolve([]),
  ]);

  // Zone A data
  const activeConnectors = connectors.filter((c) => c.status === "active");
  const recentSyncs = allJobs.filter((j) => j.status === "completed").slice(0, 10);

  // Zone C left — last 8 jobs shaped for timeline
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

  // Zone C right — connector health items
  const connectorHealthItems = connectors.map((connector) => {
    const providerInfo = CONNECTOR_PROVIDERS.find((p) => p.id === connector.provider);
    const connectorJobs = allJobs
      .filter((j) => j.connector_id === connector.id && j.status === "completed")
      .slice(0, 7)
      .reverse();

    // Compute token-level health for OAuth connectors that store tokens in config.
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

  // Zone D left — records per active connector
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

  return (
    <div className="relative min-h-full">
      {/* Aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-40 -left-40 h-[600px] w-[600px] opacity-[0.06]"
          style={{
            background:
              "radial-gradient(circle at center, hsl(221 83% 60%), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] opacity-[0.04]"
          style={{
            background:
              "radial-gradient(circle at center, hsl(280 65% 60%), transparent 70%)",
          }}
        />
      </div>

      <div className="relative space-y-6 pb-8">
        {/* Zone A — Welcome Bar */}
        <WelcomeBar
          userName={profile?.full_name ?? null}
          workspaceName={workspaceName}
          activeSourcesCount={activeConnectors.length}
          recentSyncsCount={recentSyncs.length}
        />

        {/* Zone B — Metric Grid (client, fetches Meta API) */}
        <MetricGrid />

        {/* Zone C — Pipeline + Health (8+4 grid) */}
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:grid-cols-2">
          <PipelineActivity jobs={pipelineJobs} />
          <ConnectorHealthPanel connectors={connectorHealthItems} />
        </div>

        {/* Zone D — Records by Platform + Quick Actions (6+6 grid) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SpendByPlatform data={recordsByPlatform} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  meta_ads: "#4F8BEE",
  google_ads: "#34A853",
  google_sheets: "#0F9D58",
  ga4: "#E37400",
  shopify: "#5E8E3E",
};
