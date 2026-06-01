import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { UserNav } from "@/components/dashboard/user-nav";
import type { User, Workspace } from "@/types/database";

interface TopNavbarProps {
  user: User;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  title?: string;
}

export function TopNavbar({
  user,
  workspaces,
  currentWorkspaceId,
  title = "Dashboard",
}: TopNavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
        />
        <ThemeToggle />
        <UserNav user={user} />
      </div>
    </header>
  );
}
