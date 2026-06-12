import Link from "next/link";
import { cookies } from "next/headers";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { MetaConnectButton } from "@/components/connectors/meta-connect-button";
import { MetaOAuthAlerts } from "@/components/connectors/meta-oauth-alerts";
import { MetaMetricsStrip } from "@/components/connectors/meta-metrics-strip";
import { MetaOverviewCards } from "@/components/connectors/meta-overview-cards";
import { MetaAIInsights } from "@/components/connectors/meta-ai-insights";
import { MetaIcon } from "@/components/ui/brand-icons";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getMetaOAuthConfig } from "@/lib/meta/config";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { DEMO_CONNECTORS } from "@/lib/dev/demo-data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Meta Ads" };

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

export default async function MetaAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; error?: string; reason?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("__dev_screenshot")?.value === "1";

  const workspaces = await getUserWorkspaces();
  const wsId = await getCurrentWorkspaceId(workspaces);
  const metaConfig = getMetaOAuthConfig();

  const allConnectors = isDemo
    ? DEMO_CONNECTORS
    : wsId ? await getConnectorsByWorkspace(wsId) : [];
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
    <div className="min-h-full">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 sm:px-8 lg:px-12 xl:px-16">
        <ConnectorBackLink href="/dashboard/connectors" />

        <div className="mt-4 flex items-start justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-center gap-3.5">
            <MetaIcon className="h-8 w-8" />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[15px] font-semibold leading-none tracking-tight text-foreground/92">
                  Meta Ads
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
                  act_{connector.external_account_id}
                </p>
              )}
            </div>
          </div>

          {/* Right: monitoring status */}
          <div className="flex items-center gap-3.5">
            {connector && (
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
            )}
            {connector && wsId && metaConfig && (
              <a
                href={`/api/connectors/meta/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
                className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-[11px] text-white/32 transition-all hover:border-white/[0.15] hover:text-white/60"
              >
                Reconnect
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Account Health Bar (only when connected) ─────────────── */}
      {connector && (
        <div className="mt-5 border-t border-white/[0.05]">
          <MetaMetricsStrip />
        </div>
      )}

      {/* ── OAuth alerts ────────────────────────────────────────── */}
      <div className="px-6 sm:px-8 lg:px-12 xl:px-16">
        <MetaOAuthAlerts
          oauth={params.oauth}
          error={params.error}
          reason={params.reason}
        />
      </div>

      {/* ── Tabs (secondary nav) ────────────────────────────────── */}
      <div className="flex gap-0 border-b border-white/[0.04] px-6 sm:px-8 lg:px-12 xl:px-16">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/connectors/meta?tab=${tab.id}`}
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
      <div className="px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
        {activeTab === "connect" && (
          <ConnectTab wsId={wsId} metaConfig={metaConfig} />
        )}

        {activeTab === "overview" && connector && (
          <MetaOverviewCards
            connector={{
              name: connector.name,
              status: connector.status,
              last_synced_at: connector.last_synced_at,
              external_account_id: connector.external_account_id,
            }}
            wsId={wsId}
            metaConfig={metaConfig}
          />
        )}

        {activeTab === "insights" && connector && <MetaAIInsights />}

        {activeTab === "budget" && connector && <BudgetTab />}

        {activeTab === "settings" && connector && (
          <SettingsTab wsId={wsId} metaConfig={metaConfig} />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-tabs ────────────────────────────────────────────────────── */

function ConnectTab({
  wsId,
  metaConfig,
}: {
  wsId: string | null;
  metaConfig: unknown;
}) {
  const STEPS = [
    "Sign in with your Facebook account",
    "Grant Ultrametrics access to your ad accounts",
    "Choose the ad account to connect to this workspace",
  ];
  return (
    <div className="max-w-md space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Setup
        </p>
        <p className="mt-3 text-[13px] text-white/50">
          Connect a Meta ad account to import campaign performance data and unlock AI-powered insights.
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
        <MetaConnectButton workspaceId={wsId} configured={metaConfig !== null} />
      ) : (
        <button
          disabled
          className="rounded-lg bg-brand/50 px-4 py-2 text-[13px] text-white/50"
        >
          Connect with Facebook
        </button>
      )}
    </div>
  );
}

function BudgetTab() {
  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Budget Analysis
        </p>
        <p className="mt-4 text-[13px] text-white/50">
          Budget recommendations appear once your account has 7+ days of spend history.
        </p>
        <p className="mt-2 text-[12px] text-white/30">
          Ultrametrics will identify budget-constrained campaigns with strong ROAS and recommend reallocation opportunities.
        </p>
      </div>
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/70">
          Tip
        </p>
        <p className="mt-2 text-[12px] text-white/45">
          Campaigns with ROAS above 3× are typically good candidates for budget increases. Monitor your CTR trends to identify when creative fatigue sets in.
        </p>
      </div>
    </div>
  );
}

function SettingsTab({
  wsId,
  metaConfig,
}: {
  wsId: string | null;
  metaConfig: unknown;
}) {
  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-[13px] font-medium text-foreground/80">
          Reconnect account
        </p>
        <p className="mt-1 text-[12px] text-white/35">
          Refresh your Meta OAuth token if syncs are failing or the token has expired.
        </p>
        {wsId && metaConfig ? (
          <a
            href={`/api/connectors/meta/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
            className="mt-4 inline-block rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[12px] text-foreground/65 transition-colors hover:bg-white/[0.07]"
          >
            Reconnect with Facebook
          </a>
        ) : (
          <p className="mt-2 text-[11px] text-red-400/70">
            Meta OAuth is not configured in this environment.
          </p>
        )}
      </div>
    </div>
  );
}
