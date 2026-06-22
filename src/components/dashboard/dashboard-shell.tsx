"use client";

import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { BottomCommandBar } from "@/components/os/bottom-command-bar";
import { AskProvider } from "@/components/os/ask-provider";
import { AskDrawer } from "@/components/os/ask-drawer";
import { AskOrb } from "@/components/os/ask-orb";
import { EnvironmentLayer } from "@/components/dashboard/environment-layer";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <AskProvider workspaceId={currentWorkspaceId}>
    <div className="relative flex h-screen overflow-hidden bg-surface-0">
      {/* ── L0 — Environment layer (ambient light + cursor parallax) ── */}
      <EnvironmentLayer />

      {/* ── L2 — Sidebar (sits in front of environment) ─────────── */}
      <DashboardSidebar
        workspaceName={workspaceName}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        user={user}
        isMobileOpen={isMobileOpen}
        onMobileOpenChange={setIsMobileOpen}
        onCommandOpen={() => setCmdOpen(true)}
        onNotifToggle={() => setNotifOpen((v) => !v)}
      />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only top strip */}
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.05] px-4 md:hidden">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="text-foreground-muted hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="type-body font-semibold tracking-tight">
            Ultra<span className="text-brand">metrics</span>
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setCmdOpen(true)}
            className="text-foreground-muted hover:text-foreground"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* ── L1 — Canvas (transparent, scrolls over environment) ── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* ── L3 — Command bar ────────────────────────────────────── */}
        <BottomCommandBar />
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* ── L4 — Ask Ultrametrics drawer (shared conversation) ──── */}
      <AskDrawer />

      {/* ── L3 — Floating Ask Orb (desktop; hidden when drawer open) ── */}
      <AskOrb />
    </div>
    </AskProvider>
  );
}
