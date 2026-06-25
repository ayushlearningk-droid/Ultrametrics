"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell } from "lucide-react";
import {
  useNotifications,
  hydrateNotifications,
} from "@/lib/stores/notifications";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { ShortcutsHelp } from "@/components/dashboard/shortcuts-help";
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
  /** Sprint 16.1: AI Insights flag — gates the Ask Ultrametrics surfaces. */
  aiInsightsEnabled?: boolean;
}

export function DashboardShell({
  children,
  user,
  workspaces,
  currentWorkspaceId,
  workspaceName,
  aiInsightsEnabled = true,
}: DashboardShellProps) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { unreadCount } = useNotifications();

  // Populate the notification bell badge on mount, and re-hydrate when the tab
  // regains focus/visibility so the badge stays consistent after the user
  // returns from another tab (no backend realtime; poll-on-focus only).
  useEffect(() => {
    void hydrateNotifications();
    const refresh = () => {
      if (document.visibilityState === "visible") void hydrateNotifications();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // Global shortcuts reachable outside AskProvider: command palette, G-chord
  // nav, and the "?" help modal. (A / N / / / Shift+A live inside AskProvider.)
  useKeyboardShortcuts([
    { combo: "mod+k", handler: () => setCmdOpen((v) => !v) },
    { combo: "g b", handler: () => router.push("/dashboard") },
    { combo: "g c", handler: () => router.push("/dashboard/connectors") },
    { combo: "g r", handler: () => router.push("/dashboard/reports") },
    { combo: "g t", handler: () => router.push("/dashboard/timeline") },
    { combo: "g s", handler: () => router.push("/dashboard/settings") },
    { combo: "?", handler: () => setHelpOpen(true) },
  ]);

  return (
    <AskProvider workspaceId={currentWorkspaceId} aiEnabled={aiInsightsEnabled}>
    <div className="relative flex h-screen overflow-hidden bg-surface-0">
      {/* ── L0 — Environment layer (ambient light + cursor parallax) ── */}
      <EnvironmentLayer />

      {/* ── L2 — Sidebar (sits in front of environment) ─────────── */}
      <div data-no-print className="contents">
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
      </div>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only top strip */}
        <div
          data-no-print
          className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.05] px-4 md:hidden"
        >
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
          <button
            onClick={() => setNotifOpen(true)}
            className="relative text-foreground-muted hover:text-foreground"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand" />
            )}
          </button>
        </div>

        {/* ── L1 — Canvas (transparent, scrolls over environment) ── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* ── L3 — Command bar (Ask surface; hidden when AI Insights off) ── */}
        {aiInsightsEnabled && (
          <div data-no-print className="contents">
            <BottomCommandBar />
          </div>
        )}
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* ── L4 — Ask Ultrametrics (drawer + orb); hidden when AI Insights off ── */}
      {aiInsightsEnabled && (
        <>
          <AskDrawer />
          <AskOrb />
        </>
      )}
    </div>
    </AskProvider>
  );
}
