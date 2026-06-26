"use client";

import { Bell, Command, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/user-nav";
import { PageTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/types/database";

interface TopNavbarProps {
  user: User;
  onMobileMenuToggle: () => void;
  onCommandOpen?: () => void;
  onNotifToggle?: () => void;
  notifCount?: number;
}

export function TopNavbar({
  user,
  onMobileMenuToggle,
  onCommandOpen,
  onNotifToggle,
  notifCount = 0,
}: TopNavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-[hsl(var(--background))]/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <PageTitle />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Command palette trigger */}
        {onCommandOpen && (
          <button
            onClick={onCommandOpen}
            className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-foreground sm:flex"
            aria-label="Open command palette"
          >
            <Command className="h-3 w-3" />
            <span>Search…</span>
            <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Notification bell */}
        {onNotifToggle && (
          <button
            onClick={onNotifToggle}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span
                className={cn(
                  "absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-white"
                )}
              >
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </button>
        )}

        <ThemeToggle />
        <UserNav user={user} />
      </div>
    </header>
  );
}
