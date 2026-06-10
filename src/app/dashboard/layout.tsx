import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardContext } from "@/lib/data/workspaces";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardContext();

  if (!context?.authUser) {
    redirect("/login");
  }

  const { profile, workspaces, currentWorkspaceId } = context;

  if (!currentWorkspaceId) {
    redirect("/onboarding");
  }

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  return (
    <DashboardShell
      user={profile}
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
      workspaceName={currentWorkspace?.name ?? "Workspace"}
    >
      {children}
    </DashboardShell>
  );
}
