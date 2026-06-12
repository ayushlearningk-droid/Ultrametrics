import Link from "next/link";
import { cookies } from "next/headers";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { GoogleAdsConnectButton } from "@/components/connectors/google-ads-connect-button";
import { GoogleAdsOAuthAlerts } from "@/components/connectors/google-ads-oauth-alerts";
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
        { id: "recommendations", label: "AI Insights" },
        { id: "settings", label: "Settings" },
      ]
    : [{ id: "connect", label: "Connect" }];

  return (
    <div className="min-h-full">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 sm:px-8 lg:px-12 xl:px-16">
        <ConnectorBackLink href="/dashboard/connectors" />

        <div className="mt-4 flex items-start justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-center gap-3.5">
            <GoogleAdsIcon className="h-8 w-8" />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[15px] font-semibold leading-none tracking-tight text-foreground/92">
                  Google Ads
                </h1>
                {connector && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="text-[13px] leading-none text-white/45">
                      {connector.external_account_name ?? connector.name}
                    </span>
                  </>
                )}
              </div>
              {connector?.external_account_id && (
                <p className="mt-1.5 font-mono text-[10px] text-white/20">
                  #{connector.external_account_id}
                </p>
              )}
            </div>
          </div>

          {/* Right: monitoring status */}
          {connector && (
            <div className="flex items-center gap-3.5">
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-[6px] w-[6px]">
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                        connector.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex h-[6px] w-[6px] rounded-full",
                        connector.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.22em]",
                      connector.status === "active"
                        ? "text-emerald-400/80"
                        : "text-amber-400/80"
                    )}
                  >
                    {connector.status === "active" ? "AI Monitoring" : "Paused"}
                  </span>
                </div>
                {connector.last_synced_at && (
                  <p className="text-[10px] text-white/25">
                    Synced {relativeTime(connector.last_synced_at)}
                  </p>
                )}
              </div>
              {wsId && googleAdsConfig && (
                <a
                  href={`/api/connectors/google-ads/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
                  className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-[11px] text-white/32 transition-all hover:border-white/[0.15] hover:text-white/60"
                >
                  Reconnect
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Account Health Bar ───────────────────────────────────── */}
      {connector && (
        <div className="mt-5 border-t border-white/[0.05]">
          <GoogleMetricsStrip />
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
      <div className="flex gap-0 border-b border-white/[0.04] px-6 sm:px-8 lg:px-12 xl:px-16">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/connectors/google-ads?tab=${tab.id}`}
            className={cn(
              "-mb-px border-b px-3.5 py-2.5 text-[11px] font-medium transition-colors",
              activeTab === tab.id
                ? "border-white/25 text-foreground/70"
                : "border-transparent text-white/28 hover:text-white/52"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className={cn(activeTab === "overview" ? "" : "px-6 py-8 sm:px-8 lg:px-12 xl:px-16")}>
        {activeTab === "connect" && (
          <div className="px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
            <ConnectTab wsId={wsId} googleAdsConfig={googleAdsConfig} />
          </div>
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

        {activeTab === "recommendations" && connector && <RecommendationsTab />}

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
          Connect Google Ads to import campaign performance and unlock AI-powered optimisation recommendations.
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
      body: "Without conversion data, Smart Bidding cannot optimise effectively. Verify that all campaigns have at least one conversion action configured.",
    },
  ];

  return (
    <div className="max-w-xl space-y-3">
      <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
        AI Insights
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
          <p className="text-[13px] font-semibold text-foreground/85">{r.title}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">{r.body}</p>
        </div>
      ))}
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
        <p className="text-[13px] font-medium text-foreground/80">Reconnect account</p>
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
