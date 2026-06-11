"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Check,
  ChevronsUpDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Plug,
  RefreshCw,
  Search,
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

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/connectors", label: "Connectors", icon: Plug },
  { href: "/dashboard/sync-jobs", label: "Sync Jobs", icon: RefreshCw },
];

const BOTTOM_NAV = [
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export interface DashboardSidebarProps {
  workspaceName: string;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  user: User;
  isMobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onCommandOpen?: () => void;
  onNotifToggle?: () => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}

function NavItem({ href, label, icon: Icon, exact, onClose, collapsed = true }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  const inner = (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center rounded-md transition-colors duration-150",
        collapsed
          ? "h-9 w-9 justify-center"
          : "w-full gap-3 px-3 py-2 text-sm font-medium",
        isActive
          ? "bg-white/[0.07] text-foreground"
          : "text-white/30 hover:bg-white/[0.04] hover:text-white/70"
      )}
    >
      <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={isActive ? 2 : 1.5} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <div className="relative flex w-full items-center justify-center">
        {isActive && (
          <span className="pointer-events-none absolute left-0 top-1/2 h-[18px] w-[2.5px] -translate-y-1/2 rounded-r-full bg-brand" />
        )}
        <Tooltip>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="relative">
      {isActive && (
        <span className="pointer-events-none absolute left-0 top-1/2 h-[18px] w-[2.5px] -translate-y-1/2 rounded-r-full bg-brand" />
      )}
      {inner}
    </div>
  );
}

interface RailProps {
  workspaceName: string;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  user: User;
  onCommandOpen?: () => void;
  onNotifToggle?: () => void;
  onClose?: () => void;
  collapsed?: boolean;
}

function SidebarRail({
  workspaceName,
  workspaces,
  currentWorkspaceId,
  user,
  onCommandOpen,
  onNotifToggle,
  onClose,
  collapsed = true,
}: RailProps) {
  const router = useRouter();

  function selectWorkspace(id: string) {
    document.cookie = `workspace_id=${id};path=/;max-age=31536000;SameSite=Lax`;
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
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col items-center py-3 gap-1">
        {/* Brand mark */}
        <div className={cn("mb-1 flex w-full items-center", collapsed ? "justify-center" : "px-4")}>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 ring-1 ring-brand/20 transition-colors hover:bg-brand/20"
            aria-label="Ultrametrics"
          >
            <BarChart3 className="h-[15px] w-[15px] text-brand" strokeWidth={2} />
          </Link>
          {!collapsed && (
            <span className="ml-2.5 text-sm font-semibold tracking-tight">
              Ultra<span className="text-brand">metrics</span>
            </span>
          )}
        </div>

        {/* Workspace switcher */}
        <div className={cn("w-full", collapsed ? "flex justify-center" : "px-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-[11px] font-bold text-brand transition-colors hover:bg-brand/20">
                      {wsInitial}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="text-xs">
                    {workspaceName}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/[0.05]">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand/10 text-[10px] font-bold text-brand">
                    {wsInitial}
                  </div>
                  <span className="flex-1 truncate text-left text-white/70">{workspaceName}</span>
                  <ChevronsUpDown className="h-3 w-3 text-white/25" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side={collapsed ? "right" : "bottom"} className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((ws) => (
                <DropdownMenuItem key={ws.id} onClick={() => selectWorkspace(ws.id)} className="cursor-pointer text-sm">
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === currentWorkspaceId && <Check className="h-3.5 w-3.5 text-brand" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-xs text-muted-foreground">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thin separator */}
        <div className="my-1 w-full px-3">
          <div className="h-px bg-white/[0.05]" />
        </div>

        {/* Primary nav */}
        <nav className={cn("flex w-full flex-col gap-0.5", collapsed ? "items-center px-1.5" : "px-2")}>
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.href} {...item} onClose={onClose} collapsed={collapsed} />
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        {collapsed ? (
          <div className="flex w-full flex-col items-center gap-0.5 px-1.5">
            {onCommandOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onCommandOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.04] hover:text-white/60"
                  >
                    <Search className="h-[15px] w-[15px]" strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="text-xs">
                  Command palette <span className="ml-1 opacity-50">⌘K</span>
                </TooltipContent>
              </Tooltip>
            )}
            {onNotifToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onNotifToggle}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.04] hover:text-white/60"
                  >
                    <Bell className="h-[15px] w-[15px]" strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="text-xs">
                  Activity
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <div className="w-full px-2">
            {onCommandOpen && (
              <button
                onClick={onCommandOpen}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/60"
              >
                <Search className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
                <span className="flex-1 text-left">Search…</span>
                <kbd className="text-[10px] font-mono text-white/20">⌘K</kbd>
              </button>
            )}
          </div>
        )}

        {/* Thin separator */}
        <div className="my-1 w-full px-3">
          <div className="h-px bg-white/[0.05]" />
        </div>

        {/* Bottom nav */}
        <nav className={cn("flex w-full flex-col gap-0.5", collapsed ? "items-center px-1.5" : "px-2")}>
          {BOTTOM_NAV.map((item) => (
            <NavItem key={item.href} {...item} onClose={onClose} collapsed={collapsed} />
          ))}
        </nav>

        {/* User */}
        <div className={cn("mt-1 w-full", collapsed ? "flex justify-center px-1.5" : "px-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-brand/10 text-[10px] font-semibold text-brand">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="text-xs">
                    {user.full_name ?? user.email}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-white/[0.04]">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-brand/10 text-[9px] font-bold text-brand">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium leading-tight text-white/70">
                      {user.full_name ?? user.email}
                    </p>
                    {user.full_name && (
                      <p className="truncate text-[10px] leading-tight text-white/25">{user.email}</p>
                    )}
                  </div>
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side={collapsed ? "right" : "top"} className="w-48">
              <DropdownMenuLabel className="text-xs">
                <p className="font-medium">{user.full_name ?? user.email}</p>
                {user.full_name && <p className="text-muted-foreground">{user.email}</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-sm text-muted-foreground">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      {/* Desktop — always-minimal icon rail */}
      <aside className="hidden w-[52px] shrink-0 flex-col border-r border-white/[0.04] bg-[hsl(var(--sidebar))] md:flex">
        <SidebarRail {...rest} collapsed />
      </aside>

      {/* Mobile — full-width drawer */}
      <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-60 border-r border-white/[0.06] bg-[hsl(var(--sidebar))] p-0">
          <SidebarRail
            {...rest}
            collapsed={false}
            onClose={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
