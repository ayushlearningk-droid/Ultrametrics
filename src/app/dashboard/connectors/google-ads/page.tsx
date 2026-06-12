import Link from "next/link";
import { cookies } from "next/headers";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { GoogleAdsConnectButton } from "@/components/connectors/google-ads-connect-button";
import { GoogleAdsOAuthAlerts } from "@/components/connectors/google-ads-oauth-alerts";
import { GoogleSyncNowButton } from "@/components/connectors/google-sync-now-button";
import { GoogleMetricsStrip } from "@/components/connectors/google-metrics-strip";
import { GoogleOverviewCards } from "@/components/connectors/google-overview-cards";
import { GoogleAdsIcon } from "@/components/ui/brand-icons";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getGoogleAdsConfig } from "@/lib/google-ads/config";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { DEMO_CONNECTORS } from "@/lib/dev/demo-data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Google Ads" };

function relativeTime(d: string | null) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function GoogleAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; error?: string; reason?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("__dev_screenshot")?.value === "1";

  const workspaces = await getUserWorkspaces();
  const wsId = await getCurrentWorkspaceId(workspaces);
  const googleAdsConfig = getGoogleAdsConfig();

  const allConnectors = isDemo
    ? DEMO_CONNECTORS
    : wsId ? await getConnectorsByWorkspace(wsId) : [];
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
    <div className="min-h-full">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-6 pt-8 pb-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center gap-4">
          <GoogleAdsIcon className="h-9 w-9" />
          <div>
            <ConnectorBackLink href="/dashboard/connectors" />
            <h1 className="text-xl font-semibold tracking-tight">Google Ads</h1>
            {connector && (
              <p className="mt-0.5 text-[12px] text-white/35">
                {connector.external_account_name ?? connector.name}
                {connector.external_account_id && (
                  <span className="ml-2 font-mono text-[10px] text-white/20">
                    #{connector.external_account_id}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {connector && (
          <div className="flex items-center gap-2">
            <GoogleSyncNowButton
              endpoint="/api/sync/google-ads-to-google-sheets"
              source="Google Ads"
            />
          </div>
        )}
      </div>

      {/* ── Status + Metrics strip ───────────────────────────────── */}
      {connector && (
        <div className="border-y border-white/[0.06] bg-white/[0.01]">
          {/* Status row */}
          <div className="flex items-center gap-3 border-b border-white/[0.05] px-6 py-3 sm:px-8 lg:px-12 xl:px-16">
            <div
              className={cn(
                "h-[6px] w-[6px] rounded-full",
                connector.status === "active"
                  ? "animate-pulse bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/40"
                  : "bg-amber-400"
              )}
            />
            <p className="text-[12px] font-medium capitalize text-foreground/70">
              {connector.status}
            </p>
            {connector.last_synced_at && (
              <p className="ml-auto text-[11px] text-white/28">
                Last synced{" "}
                {relativeTime(connector.last_synced_at)}
              </p>
            )}
          </div>

          {/* Big metrics */}
          <div className="px-2 sm:px-4 lg:px-8 xl:px-12">
            <GoogleMetricsStrip />
          </div>
        </div>
      )}

      {/* ── OAuth alerts ────────────────────────────────────────── */}
      <div className="px-6 sm:px-8 lg:px-12 xl:px-16">
        <GoogleAdsOAuthAlerts
          oauth={params.oauth}
          error={params.error}
          reason={params.reason}
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-white/[0.06] px-6 sm:px-8 lg:px-12 xl:px-16">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/connectors/google-ads?tab=${tab.id}`}
            className={cn(
              "border-b-2 px-4 py-3 text-[13px] font-medium transition-colors -mb-px",
              activeTab === tab.id
                ? "border-brand text-foreground"
                : "border-transparent text-white/35 hover:text-white/60"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className="px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
        {activeTab === "connect" && (
          <ConnectTab wsId={wsId} googleAdsConfig={googleAdsConfig} />
        )}

        {activeTab === "overview" && connector && (
          <GoogleOverviewCards
            connector={{
              name: connector.name,
              status: connector.status,
              last_synced_at: connector.last_synced_at,
              external_account_id: connector.external_account_id,
            }}
            wsId={wsId}
            googleAdsConfig={googleAdsConfig}
          />
        )}

        {activeTab === "campaigns" && connector && <CampaignsTab />}

        {activeTab === "recommendations" && connector && (
          <RecommendationsTab />
        )}

        {activeTab === "settings" && connector && (
          <SettingsTab wsId={wsId} googleAdsConfig={googleAdsConfig} />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-tabs ────────────────────────────────────────────────────── */

function ConnectTab({
  wsId,
  googleAdsConfig,
}: {
  wsId: string | null;
  googleAdsConfig: unknown;
}) {
  const STEPS = [
    "Sign in with your Google account",
    "Grant Ultrametrics access to your Google Ads data",
    "Select the ad account to connect to this workspace",
  ];
  return (
    <div className="max-w-md space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Setup
        </p>
        <p className="mt-3 text-[13px] text-white/50">
          Connect Google Ads to import campaign performance and unlock AI-powered optimization recommendations.
        </p>
      </div>
      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] font-mono text-[10px] text-white/40">
              {i + 1}
            </span>
            <span className="text-[13px] text-white/55">{step}</span>
          </li>
        ))}
      </ol>
      {wsId ? (
        <GoogleAdsConnectButton
          workspaceId={wsId}
          configured={googleAdsConfig !== null}
        />
      ) : (
        <button
          disabled
          className="rounded-lg bg-brand/50 px-4 py-2 text-[13px] text-white/50"
        >
          Connect Google Ads
        </button>
      )}
    </div>
  );
}

function CampaignsTab() {
  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <p className="font-medium text-foreground/65">Campaign-level breakdown</p>
        <p className="mt-2 text-[12px] text-white/35">
          Campaign-level reporting is coming soon. Your data is currently synced to Google Sheets — open your connected spreadsheet for the full breakdown.
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
      body: "RSAs with 'Excellent' ad strength consistently outperform standard expanded text ads. Consider upgrading your top campaigns.",
    },
    {
      type: "info" as const,
      title: "Enable conversion tracking on all campaigns",
      body: "Without conversion data, Smart Bidding cannot optimize effectively. Verify that all campaigns have at least one conversion action configured.",
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
          <div
            className={cn(
              "absolute left-0 top-4 bottom-4 w-[3px] rounded-r",
              r.type === "opportunity" ? "bg-emerald-400" : "bg-brand"
            )}
          />
          <p className="text-[13px] font-semibold text-foreground/85">
            {r.title}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
            {r.body}
          </p>
        </div>
      ))}
      <p className="pt-2 text-[11px] text-white/20">
        AI-powered recommendations based on your account data will appear here once historical data is available.
      </p>
    </div>
  );
}

function SettingsTab({
  wsId,
  googleAdsConfig,
}: {
  wsId: string | null;
  googleAdsConfig: unknown;
}) {
  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-[13px] font-medium text-foreground/80">
          Reconnect account
        </p>
        <p className="mt-1 text-[12px] text-white/35">
          Refresh your Google OAuth token if syncs are failing or the token has expired.
        </p>
        {wsId && googleAdsConfig ? (
          <a
            href={`/api/connectors/google-ads/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
            className="mt-4 inline-block rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[12px] text-foreground/65 transition-colors hover:bg-white/[0.07]"
          >
            Reconnect with Google
          </a>
        ) : (
          <p className="mt-2 text-[11px] text-red-400/70">
            Google Ads OAuth is not configured in this environment.
          </p>
        )}
      </div>
    </div>
  );
}
