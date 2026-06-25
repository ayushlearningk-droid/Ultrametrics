import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardContext } from "@/lib/data/workspaces";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";
import type { User } from "@/types/database";

const DEMO_USER: User = {
  id: "demo",
  email: "demo@ultrametrics.app",
  full_name: "Demo User",
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isDevScreenshot = cookieStore.get("__dev_screenshot")?.value === "1";

  const context = await getDashboardContext();

  if (!context?.authUser && !isDevScreenshot) {
    redirect("/login");
  }

  const { profile, workspaces, currentWorkspaceId } =
    context ?? { profile: null, workspaces: [], currentWorkspaceId: null };

  if (!currentWorkspaceId && !isDevScreenshot) {
    redirect("/onboarding");
  }

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  // Sprint 16.1: AI Insights feature flag — gates the Ask Ultrametrics surfaces.
  const aiInsightsEnabled = currentWorkspaceId
    ? toSettingsValues(await getWorkspaceSettings(currentWorkspaceId))
        .ai_insights_enabled
    : true;

  return (
    <DashboardShell
      user={profile ?? DEMO_USER}
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId ?? "demo"}
      workspaceName={currentWorkspace?.name ?? "Demo Workspace"}
      aiInsightsEnabled={aiInsightsEnabled}
    >
      {children}
    </DashboardShell>
  );
}
