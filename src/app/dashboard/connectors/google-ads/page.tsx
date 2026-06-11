import Link from "next/link";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { GoogleAdsConnectButton } from "@/components/connectors/google-ads-connect-button";
import { GoogleAdsOAuthAlerts } from "@/components/connectors/google-ads-oauth-alerts";
import { GoogleSyncNowButton } from "@/components/connectors/google-sync-now-button";
import { GoogleAdsIcon } from "@/components/ui/brand-icons";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getGoogleAdsConfig } from "@/lib/google-ads/config";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { cn } from "@/lib/utils";

export const metadata = { title: "Google Ads" };

export default async function GoogleAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; error?: string; reason?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const workspaces = await getUserWorkspaces();
  const wsId = await getCurrentWorkspaceId(workspaces);
  const googleAdsConfig = getGoogleAdsConfig();

  const allConnectors = wsId ? await getConnectorsByWorkspace(wsId) : [];
  const connector = allConnectors.find((c) => c.provider === "google_ads") ?? null;

  const activeTab = params.tab ?? (connector ? "overview" : "connect");

  const tabs = connector
    ? [
        { id: "overview", label: "Overview" },
        { id: "campaigns", label: "Campaigns" },
        { id: "recommendations", label: "AI Recommendations" },
        { id: "settings", label: "Settings" },
      ]
    : [{ id: "connect", label: "Connect" }];

  return (
    <div className="min-h-full px-6 py-10 sm:px-8 lg:px-12 xl:px-16">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <GoogleAdsIcon className="h-10 w-10" />
          <div>
            <div className="flex items-center gap-2">
              <ConnectorBackLink href="/dashboard/connectors" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Google Ads</h1>
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

        {connector && (
          <div className="flex items-center gap-2">
            <a
              href="/dashboard/connectors/google-ads/create-campaign"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              + New campaign
            </a>
          </div>
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
      <GoogleAdsOAuthAlerts oauth={params.oauth} error={params.error} reason={params.reason} />

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/connectors/google-ads?tab=${tab.id}`}
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
        <ConnectTab wsId={wsId} googleAdsConfig={googleAdsConfig} />
      )}

      {activeTab === "overview" && connector && (
        <OverviewTab connector={connector} wsId={wsId} googleAdsConfig={googleAdsConfig} />
      )}

      {activeTab === "campaigns" && connector && (
        <CampaignsTab />
      )}

      {activeTab === "recommendations" && connector && (
        <RecommendationsTab />
      )}

      {activeTab === "settings" && connector && (
        <SettingsTab wsId={wsId} googleAdsConfig={googleAdsConfig} />
      )}
    </div>
  );
}

function ConnectTab({ wsId, googleAdsConfig }: { wsId: string | null; googleAdsConfig: unknown }) {
  const STEPS = [
    "Sign in with your Google account",
    "Grant Ultrametrics access to your Google Ads",
    "Select the ad account to connect",
  ];
  return (
    <div className="max-w-md space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Setup</p>
        <p className="mt-3 text-sm text-white/50">
          Connect Google Ads to import campaign performance and unlock AI-powered optimization recommendations.
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
        <GoogleAdsConnectButton workspaceId={wsId} configured={googleAdsConfig !== null} />
      ) : (
        <button disabled className="rounded-lg bg-brand/50 px-4 py-2 text-sm text-white/50">
          Connect Google Ads
        </button>
      )}
    </div>
  );
}

function OverviewTab({
  connector,
  wsId,
  googleAdsConfig,
}: {
  connector: { name: string; status: string; last_synced_at: string | null; external_account_id?: string | null };
  wsId: string | null;
  googleAdsConfig: unknown;
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

      <div className="flex items-center gap-3">
        <GoogleSyncNowButton endpoint="/api/sync/google-ads-to-google-sheets" source="Google Ads" />
        {wsId && !!googleAdsConfig && (
          <a
            href={`/api/connectors/google-ads/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/70"
          >
            Reconnect
          </a>
        )}
      </div>
    </div>
  );
}

function CampaignsTab() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <span className="text-xl">📊</span>
        </div>
        <p className="font-medium text-foreground/70">Campaign-level data</p>
        <p className="mt-2 text-sm text-white/35">
          Campaign-level breakdown is coming soon. Currently Ultrametrics syncs account-level performance data.
        </p>
        <p className="mt-3 text-xs text-white/25">
          Your data is being synced to Google Sheets. Open your connected spreadsheet to see the full breakdown.
        </p>
      </div>
    </div>
  );
}

function RecommendationsTab() {
  const recs = [
    {
      type: "opportunity" as const,
      title: "Increase budget on high-ROAS campaigns",
      body: "Campaigns returning ROAS > 4× are typically budget-constrained. Reallocating 20–30% of spend from underperformers could significantly improve blended returns.",
    },
    {
      type: "info" as const,
      title: "Review keyword match types",
      body: "Broad match keywords often waste budget on irrelevant queries. Auditing search term reports and adding negative keywords can reduce wasted spend by 10–25%.",
    },
    {
      type: "opportunity" as const,
      title: "Experiment with responsive search ads",
      body: "RSAs with ad strength 'Excellent' consistently outperform standard expanded text ads. Consider upgrading your top campaigns.",
    },
  ];

  return (
    <div className="max-w-xl space-y-3">
      <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
        Recommendations
      </p>
      {recs.map((r, i) => (
        <div
          key={i}
          className={cn(
            "relative rounded-xl border p-5 pl-6",
            r.type === "opportunity"
              ? "border-emerald-500/20 bg-emerald-500/[0.04]"
              : "border-brand/20 bg-brand/[0.04]"
          )}
        >
          <div className={cn(
            "absolute left-0 top-5 bottom-5 w-[3px] rounded-r",
            r.type === "opportunity" ? "bg-emerald-400" : "bg-brand"
          )} />
          <p className="text-[13px] font-semibold text-foreground/85">{r.title}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{r.body}</p>
        </div>
      ))}
      <p className="pt-2 text-[11px] text-white/20">
        AI-powered recommendations based on your account data will appear here once historical data is available.
      </p>
    </div>
  );
}

function SettingsTab({ wsId, googleAdsConfig }: { wsId: string | null; googleAdsConfig: unknown }) {
  return (
    <div className="max-w-md space-y-6">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-sm font-medium text-foreground/80">Reconnect account</p>
        <p className="mt-1 text-sm text-white/35">
          Refresh your Google OAuth token if syncs are failing or the token has expired.
        </p>
        {wsId && googleAdsConfig ? (
          <a
            href={`/api/connectors/google-ads/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
            className="mt-4 inline-block rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/[0.07]"
          >
            Reconnect with Google
          </a>
        ) : (
          <p className="mt-2 text-xs text-red-400/70">Google Ads OAuth is not configured in this environment.</p>
        )}
      </div>
    </div>
  );
}
