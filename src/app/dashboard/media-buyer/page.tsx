/**
 * AI Media Buyer — page (Sprint 38).
 *
 * Server-builds a grounded optimization PLAN from the existing engines and
 * renders the planning workspace. Honours the AI Insights flag. Planning only —
 * no execution, no campaign edits, no DB/connector/OAuth changes.
 */

import { FileText } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { getDashboardContext } from "@/lib/data/workspaces";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";
import { buildOptimizationContext } from "@/lib/ai/media-buyer/context";
import { buildOptimizationPlan } from "@/lib/ai/media-buyer/plan";
import { MediaBuyer } from "@/components/dashboard/media-buyer";

export const metadata = { title: "Media Buyer" };

function EmptyState({ title, body }: { title: string; body: string }) {
  return <DashboardEmptyState icon={FileText} title={title} description={body} />;
}

export default async function MediaBuyerPage() {
  const context = await getDashboardContext();
  const workspaces = context?.workspaces ?? [];
  const currentWorkspaceId = context?.currentWorkspaceId ?? null;
  const ws = workspaces.find((w) => w.id === currentWorkspaceId);

  if (!currentWorkspaceId || !ws) {
    return (
      <EmptyState
        title="No workspace selected"
        body="Select or create a workspace to plan optimizations."
      />
    );
  }

  const aiEnabled = toSettingsValues(
    await getWorkspaceSettings(currentWorkspaceId)
  ).ai_insights_enabled;
  if (!aiEnabled) {
    return (
      <EmptyState
        title="AI Insights are off for this workspace"
        body="Enable AI Insights in Settings → Workspace to plan optimizations."
      />
    );
  }

  const optCtx = await buildOptimizationContext(currentWorkspaceId, ws.name);
  if (!optCtx) {
    return (
      <EmptyState
        title="Not enough data yet"
        body="Connect a source or wait for the next sync to build an optimization plan."
      />
    );
  }

  const plan = buildOptimizationPlan(optCtx.creativeInput, optCtx.reasoningInput);

  return <MediaBuyer plan={plan} workspaceName={ws.name} />;
}
