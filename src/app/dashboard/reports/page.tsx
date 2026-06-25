/**
 * AI Reports Engine — page (Sprint 18).
 *
 * Server-composes the report from the EXISTING engines (composeBrief) and
 * renders the export/print-ready ReportView (which reuses KpiStrip + AiResponse).
 * Honours the AI Insights workspace flag (Sprint 16.1). Empty/error states are
 * handled here; the loading state lives in loading.tsx (Next route loading UI).
 *
 * No Action Engine, Google Ads, or connector logic is touched.
 */

import { FileText, AlertTriangle } from "lucide-react";
import { getDashboardContext } from "@/lib/data/workspaces";
import { composeBrief, type BriefData } from "@/lib/ai/brief/compose-brief";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";
import { ReportView } from "@/components/dashboard/report-view";

export const metadata = { title: "Reports" };

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <FileText className="mb-3 h-6 w-6 text-foreground-muted" />
        <h1 className="type-body font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-sm type-caption text-foreground-muted">{body}</p>
      </div>
    </div>
  );
}

export default async function ReportsPage() {
  const context = await getDashboardContext();
  const workspaces = context?.workspaces ?? [];
  const currentWorkspaceId = context?.currentWorkspaceId ?? null;
  const ws = workspaces.find((w) => w.id === currentWorkspaceId);

  if (!currentWorkspaceId || !ws) {
    return (
      <EmptyState
        title="No workspace selected"
        body="Select or create a workspace to generate a report."
      />
    );
  }

  // AI Insights flag (Sprint 16.1) — reports are an AI Insights surface.
  const aiInsightsEnabled = toSettingsValues(
    await getWorkspaceSettings(currentWorkspaceId)
  ).ai_insights_enabled;
  if (!aiInsightsEnabled) {
    return (
      <EmptyState
        title="AI Insights are off for this workspace"
        body="Enable AI Insights in Settings → Workspace to generate reports."
      />
    );
  }

  let data: BriefData;
  try {
    data = await composeBrief({
      workspaceId: currentWorkspaceId,
      workspaceName: ws.name,
    });
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <div className="rounded-xl border border-red-400/25 bg-red-400/[0.06] px-6 py-16 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-red-400/80" />
          <h1 className="type-body font-semibold text-foreground">
            Couldn&apos;t generate this report
          </h1>
          <p className="mx-auto mt-1 max-w-sm type-caption text-foreground-muted">
            Something went wrong while analysing your data. Please try again
            shortly.
          </p>
        </div>
      </div>
    );
  }

  if (data.status === "no_data") {
    return (
      <EmptyState
        title="Not enough data yet"
        body="Connect a source or wait for the next sync to generate your report."
      />
    );
  }

  return <ReportView data={data} workspaceName={ws.name} />;
}
