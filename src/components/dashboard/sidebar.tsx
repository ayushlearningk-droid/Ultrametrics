"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Check,
  ChevronsUpDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, Workspace } from "@/types/database";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/connectors", label: "Connectors", icon: Plug },
  { href: "/dashboard/sync-jobs", label: "Sync Jobs", icon: RefreshCw },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export interface DashboardSidebarProps {
  workspaceName: string;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  user: User;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

interface SidebarInnerProps
  extends Omit<DashboardSidebarProps, "isMobileOpen" | "onMobileOpenChange"> {
  onClose?: () => void;
}

function SidebarInner({
  workspaceName,
  workspaces,
  currentWorkspaceId,
  user,
  isCollapsed,
  onToggleCollapse,
  onClose,
}: SidebarInnerProps) {
  const pathname = usePathname();
  const router = useRouter();

  function selectWorkspace(workspaceId: string) {
    document.cookie = `workspace_id=${workspaceId};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
    onClose?.();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const userInitials = getInitials(user.full_name, user.email);
  const wsInitial = workspaceName.charAt(0).toUpperCase();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border",
            isCollapsed ? "justify-center px-3" : "px-5"
          )}
        >
          {isCollapsed ? (
            <Link href="/dashboard" aria-label="Ultrametrics home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-lg shadow-brand/30">
                <BarChart3 className="h-4 w-4" />
              </span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-lg shadow-brand/30">
                <BarChart3 className="h-4 w-4" />
              </span>
              <span className="text-base tracking-tight">
                Ultra<span className="text-brand">metrics</span>
              </span>
            </Link>
          )}
        </div>

        {/* Workspace selector */}
        <div
          className={cn(
            "border-b border-border",
            isCollapsed ? "px-2 py-2.5" : "px-3 py-2.5"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-xs font-bold text-brand">
                  {wsInitial}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate text-sm font-medium">
                      {workspaceName}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isCollapsed ? "start" : "start"}
              side={isCollapsed ? "right" : "bottom"}
              className="w-[220px]"
            >
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => selectWorkspace(workspace.id)}
                  className="cursor-pointer"
                >
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {workspace.id === currentWorkspaceId && (
                    <Check className="h-4 w-4 text-brand" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-muted-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Create workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center justify-center rounded-lg p-2.5 transition-colors",
                        isActive
                          ? "bg-brand/10 text-brand"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div
          className={cn(
            "hidden border-t border-border p-2 md:flex",
            isCollapsed ? "justify-center" : "justify-end"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "right" : "top"}>
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* User section */}
        <div
          className={cn(
            "border-t border-border p-3",
            isCollapsed ? "flex justify-center" : ""
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-brand/10 text-xs text-brand">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handleLogout}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Log out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{user.full_name ?? user.email}</p>
                {user.full_name && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand/10 text-xs text-brand">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium leading-tight">
                  {user.full_name ?? user.email}
                </span>
                <span className="truncate text-xs leading-tight text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function DashboardSidebar({
  isMobileOpen,
  onMobileOpenChange,
  ...rest
}: DashboardSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out md:flex",
          rest.isCollapsed ? "w-[52px]" : "w-64"
        )}
      >
        <SidebarInner {...rest} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarInner {...rest} isCollapsed={false} onToggleCollapse={() => {}} onClose={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
