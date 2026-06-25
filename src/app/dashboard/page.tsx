/**
 * Dashboard home — the AI Morning Brief (Sprint 4 Phase B).
 *
 * Server-composes the brief from the existing engines (via composeBrief) and
 * renders it. Connectors / sync remain reachable via the sidebar (Connectors,
 * Pipeline) and their routes — they are not duplicated here.
 */

import { getDashboardContext } from "@/lib/data/workspaces";
import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { composeBrief, type BriefData } from "@/lib/ai/brief/compose-brief";
import { MorningBrief } from "@/components/dashboard/morning-brief";
import type { ActivityItem } from "@/components/dashboard/brief-activity-feed";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";

export const metadata = { title: "Brief" };

function fallbackBrief(): BriefData {
  const h = new Date().getHours();
  return {
    greeting:
      h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
    dateLabel: new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    status: "no_data",
    summary: "Connect Meta Ads or Google Ads to generate your morning brief.",
    kpis: [],
    cardsMarkdown: "",
  };
}

export default async function DashboardPage() {
  const context = await getDashboardContext();
  const workspaces = context?.workspaces ?? [];
  const currentWorkspaceId = context?.currentWorkspaceId ?? null;
  const ws = workspaces.find((w) => w.id === currentWorkspaceId);

  // Sprint 16.1: AI Insights feature flag. When disabled for this workspace, the
  // Morning Brief (and its AI Opportunity/Risk cards) is hidden entirely.
  const aiInsightsEnabled =
    currentWorkspaceId && ws
      ? toSettingsValues(await getWorkspaceSettings(currentWorkspaceId))
          .ai_insights_enabled
      : true;

  if (!aiInsightsEnabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="type-body font-semibold text-foreground">
            AI Insights are off for this workspace
          </h1>
          <p className="mt-1 max-w-sm type-caption text-foreground-muted">
            Enable AI Insights in Settings → Workspace to see your Morning Brief,
            opportunities, and recommendations.
          </p>
        </div>
      </div>
    );
  }

  const data: BriefData =
    currentWorkspaceId && ws
      ? await composeBrief({
          workspaceId: currentWorkspaceId,
          workspaceName: ws.name,
        })
      : fallbackBrief();

  // Phase B — Activity Feed: join recent sync jobs with their connector
  // (name/provider) for display. Reuses existing data fetchers; no DB/API
  // changes. Empty when no workspace.
  let activity: ActivityItem[] = [];
  if (currentWorkspaceId && ws) {
    const [jobs, connectors] = await Promise.all([
      getSyncJobsByWorkspace(currentWorkspaceId, 8),
      getConnectorsByWorkspace(currentWorkspaceId),
    ]);
    const byId = new Map(connectors.map((c) => [c.id, c]));
    activity = jobs.map((j) => {
      const c = byId.get(j.connector_id);
      return {
        id: j.id,
        status: j.status,
        name: c?.name ?? "Sync job",
        provider: c?.provider ?? "—",
        records: j.records_processed,
        createdAt: j.created_at,
        completedAt: j.completed_at,
      };
    });
  }

  return (
    <MorningBrief
      data={data}
      activity={activity}
      workspaceName={ws?.name ?? "Workspace"}
      userName={context?.profile?.full_name ?? null}
    />
  );
}
