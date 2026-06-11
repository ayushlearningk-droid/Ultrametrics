import Link from "next/link";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { MetaConnectButton } from "@/components/connectors/meta-connect-button";
import { MetaOAuthAlerts } from "@/components/connectors/meta-oauth-alerts";
import { MetaAIInsights } from "@/components/connectors/meta-ai-insights";
import { MetaIcon } from "@/components/ui/brand-icons";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getMetaOAuthConfig } from "@/lib/meta/config";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { cn } from "@/lib/utils";

export const metadata = { title: "Meta Ads" };

export default async function MetaAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; error?: string; reason?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const workspaces = await getUserWorkspaces();
  const wsId = await getCurrentWorkspaceId(workspaces);
  const metaConfig = getMetaOAuthConfig();

  const allConnectors = wsId ? await getConnectorsByWorkspace(wsId) : [];
  const connector = allConnectors.find((c) => c.provider === "meta_ads") ?? null;

  const activeTab = params.tab ?? (connector ? "overview" : "connect");

  const tabs = connector
    ? [
        { id: "overview", label: "Overview" },
        { id: "insights", label: "AI Insights" },
        { id: "budget", label: "Budget" },
        { id: "settings", label: "Settings" },
      ]
    : [{ id: "connect", label: "Connect" }];

  return (
    <div className="min-h-full px-6 py-10 sm:px-8 lg:px-12 xl:px-16">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <MetaIcon className="h-10 w-10" />
          <div>
            <div className="flex items-center gap-2">
              <ConnectorBackLink href="/dashboard/connectors" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Meta Ads</h1>
            {connector && (
              <p className="mt-0.5 text-sm text-white/35">
                {connector.external_account_name ?? connector.name}
                {connector.external_account_id && (
                  <span className="ml-2 font-mono text-[11px] text-white/20">
                    #{connector.external_account_id}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {connector && wsId && metaConfig && (
          <a
            href={`/api/connectors/meta/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
            className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-sm text-white/50 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white/90"
          >
            Reconnect
          </a>
        )}
      </div>

      {/* Status bar */}
      {connector && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3">
          <div className={cn(
            "h-2 w-2 rounded-full",
            connector.status === "active" ? "bg-emerald-400 shadow-emerald-400/40 shadow-[0_0_6px]" : "bg-amber-400"
          )} />
          <p className="text-sm font-medium capitalize text-foreground/80">{connector.status}</p>
          {connector.last_synced_at && (
            <p className="ml-auto text-xs text-white/30">
              Last synced {new Date(connector.last_synced_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* OAuth alerts */}
      <MetaOAuthAlerts oauth={params.oauth} error={params.error} reason={params.reason} />

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/connectors/meta?tab=${tab.id}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-brand text-foreground"
                : "border-transparent text-white/35 hover:text-white/60"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "connect" && (
        <ConnectTab wsId={wsId} metaConfig={metaConfig} />
      )}

      {activeTab === "overview" && connector && (
        <OverviewTab connector={connector} wsId={wsId} metaConfig={metaConfig} />
      )}

      {activeTab === "insights" && connector && (
        <MetaAIInsights />
      )}

      {activeTab === "budget" && connector && (
        <BudgetTab />
      )}

      {activeTab === "settings" && connector && (
        <SettingsTab connector={connector} wsId={wsId} metaConfig={metaConfig} />
      )}
    </div>
  );
}

function ConnectTab({ wsId, metaConfig }: { wsId: string | null; metaConfig: unknown }) {
  const STEPS = [
    "Sign in with your Facebook account",
    "Grant Ultrametrics access to your ad accounts",
    "Choose the ad account to connect to this workspace",
  ];
  return (
    <div className="max-w-md space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Setup</p>
        <p className="mt-3 text-sm text-white/50">
          Connect a Meta ad account to import campaign performance data into Ultrametrics.
        </p>
      </div>
      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] font-mono text-[10px] text-white/40">
              {i + 1}
            </span>
            <span className="text-sm text-white/55">{step}</span>
          </li>
        ))}
      </ol>
      {wsId ? (
        <MetaConnectButton workspaceId={wsId} configured={metaConfig !== null} />
      ) : (
        <button disabled className="rounded-lg bg-brand/50 px-4 py-2 text-sm text-white/50">
          Connect with Facebook
        </button>
      )}
    </div>
  );
}

function OverviewTab({
  connector,
}: {
  connector: { name: string; status: string; last_synced_at: string | null; external_account_id?: string | null };
  wsId?: string | null;
  metaConfig?: unknown;
}) {
  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.05]">
        {[
          { label: "Connector name", value: connector.name },
          { label: "Account ID", value: connector.external_account_id ?? "—" },
          { label: "Status", value: connector.status, capitalize: true },
          { label: "Last sync", value: connector.last_synced_at ? new Date(connector.last_synced_at).toLocaleString() : "Never" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
            <p className="text-xs text-white/35">{row.label}</p>
            <p className={cn("text-sm font-medium text-foreground/80", row.capitalize && "capitalize")}>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetTab() {
  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Budget analysis</p>
        <p className="mt-4 text-sm text-white/50">
          Budget recommendations will appear here once your account has sufficient historical data (minimum 7 days of spend).
        </p>
        <p className="mt-3 text-sm text-white/35">
          Connect more data sources and let Ultrametrics build a baseline of your spending patterns to unlock personalized budget optimization recommendations.
        </p>
      </div>
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/70">Tip</p>
        <p className="mt-2 text-sm text-white/50">
          Campaigns with ROAS above 3.0 are typically good candidates for budget increases. Monitor your CTR trends to identify when creative fatigue sets in.
        </p>
      </div>
    </div>
  );
}

function SettingsTab({
  wsId,
  metaConfig,
}: {
  connector?: { name: string };
  wsId: string | null;
  metaConfig: unknown;
}) {
  return (
    <div className="max-w-md space-y-6">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-sm font-medium text-foreground/80">Reconnect account</p>
        <p className="mt-1 text-sm text-white/35">
          Refresh your Meta OAuth token if syncs are failing or the token has expired.
        </p>
        {wsId && metaConfig ? (
          <a
            href={`/api/connectors/meta/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
            className="mt-4 inline-block rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/[0.07]"
          >
            Reconnect with Facebook
          </a>
        ) : (
          <p className="mt-2 text-xs text-red-400/70">Meta OAuth is not configured in this environment.</p>
        )}
      </div>
    </div>
  );
}
