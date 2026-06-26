/**
 * Creative Studio — page (Sprint 37).
 *
 * Server-builds a grounded creative plan from the existing engines and renders
 * the CreativeStudio client surface. Honours the AI Insights workspace flag.
 * Planning layer only — no image/video generation, no DB/connector/Action
 * changes. Empty states handled here.
 */

import { FileText } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { getDashboardContext } from "@/lib/data/workspaces";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";
import { buildCreativeInput } from "@/lib/ai/creative/context";
import { computeCreativeSignals } from "@/lib/ai/creative/intelligence";
import { generateStrategy } from "@/lib/ai/creative/strategy";
import { generateCreativeBrief } from "@/lib/ai/creative/brief";
import { generateHooks } from "@/lib/ai/creative/hooks";
import { generateCopy } from "@/lib/ai/creative/copy";
import { generateStoryboard } from "@/lib/ai/creative/storyboard";
import { CreativeStudio } from "@/components/dashboard/creative-studio";

export const metadata = { title: "Creative Studio" };

function EmptyState({ title, body }: { title: string; body: string }) {
  return <DashboardEmptyState icon={FileText} title={title} description={body} />;
}

export default async function CreativeStudioPage() {
  const context = await getDashboardContext();
  const workspaces = context?.workspaces ?? [];
  const currentWorkspaceId = context?.currentWorkspaceId ?? null;
  const ws = workspaces.find((w) => w.id === currentWorkspaceId);

  if (!currentWorkspaceId || !ws) {
    return (
      <EmptyState
        title="No workspace selected"
        body="Select or create a workspace to plan creative."
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
        body="Enable AI Insights in Settings → Workspace to plan creative."
      />
    );
  }

  const input = await buildCreativeInput(currentWorkspaceId, ws.name);
  if (!input) {
    return (
      <EmptyState
        title="Not enough data yet"
        body="Connect a source or wait for the next sync to ground a creative plan."
      />
    );
  }

  const signals = computeCreativeSignals(input);
  const strategy = generateStrategy(signals);
  const brief = generateCreativeBrief(input, signals, strategy);
  const hooks = generateHooks(signals);
  const copy = generateCopy(signals, strategy);
  const storyboard = generateStoryboard(signals, strategy);

  return (
    <CreativeStudio
      signals={signals}
      strategy={strategy}
      brief={brief}
      hooks={hooks}
      copy={copy}
      storyboard={storyboard}
    />
  );
}
