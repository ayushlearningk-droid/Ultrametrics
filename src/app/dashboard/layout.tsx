import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { TopNavbar } from "@/components/dashboard/top-navbar";
import { getDashboardContext } from "@/lib/data/workspaces";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardContext();

  // Only unauthenticated users go to login — middleware handles most cases;
  // this guard covers Server Component reads when the session is missing.
  if (!context?.authUser) {
    redirect("/login");
  }

  const { profile, workspaces, currentWorkspaceId } = context;

  // Authenticated but no workspace — onboarding, not /login (avoids middleware loop).
  if (!currentWorkspaceId) {
    redirect("/onboarding");
  }

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar workspaceName={currentWorkspace?.name ?? "Workspace"} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar
          user={profile}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
