"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { TopNavbar } from "@/components/dashboard/top-navbar";
import type { User, Workspace } from "@/types/database";

interface DashboardShellProps {
  children: React.ReactNode;
  user: User;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  workspaceName: string;
}

export function DashboardShell({
  children,
  user,
  workspaces,
  currentWorkspaceId,
  workspaceName,
}: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        workspaceName={workspaceName}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        user={user}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((c) => !c)}
        isMobileOpen={isMobileOpen}
        onMobileOpenChange={setIsMobileOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar
          user={user}
          onMobileMenuToggle={() => setIsMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
