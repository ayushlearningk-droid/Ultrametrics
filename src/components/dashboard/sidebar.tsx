"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { slideUp, staggerChildren } from "@/lib/motion";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronsUpDown,
  CreditCard,
  Gauge,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Plug,
  FileText,
  History,
  Sparkles,
  Search,
  Settings,
} from "lucide-react";
import { useAsk } from "@/components/os/ask-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BRAND_ICON_MAP } from "@/components/ui/brand-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, Workspace } from "@/types/database";

/* ── Connector group (Arc-style live status nav) ─────────────────── */
const CONNECTORS = [
  { href: "/dashboard/connectors/meta", label: "Meta Ads", provider: "meta_ads" },
  { href: "/dashboard/connectors/google-ads", label: "Google Ads", provider: "google_ads" },
];

/* ── Sidebar V7 navigation (Sprint 4 Phase C) ────────────────────── */
const PRIMARY_NAV = [
  { href: "/dashboard", label: "Brief", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/actions", label: "Actions", icon: ListTodo },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/timeline", label: "Timeline", icon: History },
  { href: "/dashboard/connectors", label: "Connectors", icon: Plug },
];

const BOTTOM_NAV = [
  { href: "/dashboard/ai-usage", label: "AI Usage", icon: Gauge },
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

function useActive(href: string, exact?: boolean) {
  const pathname = usePathname();
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

/* ── Primary nav item ─────────────────────────────────────────────── */
function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  onClose,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClose?: () => void;
}) {
  const isActive = useActive(href, exact);
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 type-body transition-all duration-150",
        isActive
          ? "bg-white/[0.06] text-foreground"
          : "text-foreground-muted hover:bg-white/[0.035] hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_8px_1px] shadow-brand/60" />
      )}
      <Icon
        className={cn("h-[17px] w-[17px] shrink-0", isActive && "text-brand")}
        strokeWidth={isActive ? 2.2 : 1.7}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/* ── Connector item with live status dot ──────────────────────────── */
function ConnectorItem({
  href,
  label,
  provider,
  onClose,
}: {
  href: string;
  label: string;
  provider: string;
  onClose?: () => void;
}) {
  const isActive = useActive(href);
  const BrandIcon = BRAND_ICON_MAP[provider];
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg py-1.5 pl-3 pr-3 type-body transition-all duration-150",
        isActive
          ? "bg-white/[0.05] text-foreground"
          : "text-foreground-muted hover:bg-white/[0.03] hover:text-foreground"
      )}
    >
      {BrandIcon ? (
        <BrandIcon className="h-[15px] w-[15px] shrink-0 opacity-80" />
      ) : (
        <span className="h-[15px] w-[15px] shrink-0" />
      )}
      <span className="flex-1 truncate">{label}</span>
      {/* live status dot + monitoring pulse */}
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        <span className="anim-pulse absolute inline-flex h-2 w-2 rounded-full bg-brand/60" />
        <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-brand shadow-[0_0_6px_1px] shadow-brand/50" />
      </span>
    </Link>
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
  onCollapse?: () => void;
  collapsible?: boolean;
}

function SidebarRail({
  workspaceName,
  workspaces,
  currentWorkspaceId,
  user,
  onCommandOpen,
  onNotifToggle,
  onClose,
  onCollapse,
  collapsible,
}: RailProps) {
  const router = useRouter();
  const { open: openAsk, isOpen: isAskOpen } = useAsk();
  const reduce = useReducedMotion();

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
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      {/* ── Brand + monitoring pulse ──────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center"
          aria-label="Ultrametrics"
        >
          <span className="anim-pulse absolute inline-flex h-3 w-3 rounded-full bg-brand/40" />
          <span className="relative inline-flex h-[9px] w-[9px] rounded-full bg-brand shadow-[0_0_10px_2px] shadow-brand/60" />
        </Link>
        <span className="type-body font-semibold tracking-tight">
          Ultra<span className="text-brand">metrics</span>
        </span>
        <div className="flex-1" />
        {collapsible && (
          <button
            onClick={onCollapse}
            className="hidden text-foreground-muted transition-colors hover:text-foreground md:block"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.7} />
          </button>
        )}
      </div>

      {/* ── Workspace switcher ────────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="mb-1 flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 transition-colors hover:bg-white/[0.05]">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/15 type-caption font-semibold text-brand">
              {wsInitial}
            </div>
            <span className="flex-1 truncate text-left type-body text-foreground/85">
              {workspaceName}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-foreground-muted" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="type-caption text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => selectWorkspace(ws.id)}
              className="cursor-pointer type-body"
            >
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === currentWorkspaceId && <Check className="h-3.5 w-3.5 text-brand" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer type-caption text-muted-foreground">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Command trigger ───────────────────────────────────────── */}
      {onCommandOpen && (
        <button
          onClick={onCommandOpen}
          className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 type-body text-foreground-muted transition-all duration-200 hover:border-brand/40 hover:bg-brand/15 hover:text-foreground hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35)] active:border-brand/50 active:bg-brand/20 active:text-foreground active:shadow-[0_0_0_1px_rgba(16,185,129,0.45)]"
        >
          <Search className="h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
          <span className="flex-1 text-left">Ask Ultrametrics</span>
          <kbd className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
            ⌘K
          </kbd>
        </button>
      )}

      {/* ── Ask (opens the drawer) ────────────────────────────────── */}
      <button
        onClick={() => {
          openAsk();
          onClose?.();
        }}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg border px-3 py-2 type-body transition-all duration-200",
          isAskOpen
            ? "border-brand/40 bg-brand/15 text-foreground shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
            : "border-transparent text-foreground-muted hover:border-brand/30 hover:bg-brand/10 hover:text-foreground"
        )}
      >
        <Sparkles className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
        <span className="truncate">Ask</span>
      </button>

      {/* ── Primary nav (Brief · Reports · Timeline · Connectors) ──── */}
      <motion.nav
        className="flex flex-col gap-0.5"
        variants={staggerChildren}
        initial={reduce ? false : "hidden"}
        animate="visible"
      >
        {PRIMARY_NAV.map((item) => (
          <motion.div key={item.href} variants={slideUp}>
            <NavItem {...item} onClose={onClose} />
          </motion.div>
        ))}
      </motion.nav>

      {/* ── Connector group ───────────────────────────────────────── */}
      <div className="mt-4 px-3">
        <p className="type-eyebrow text-foreground-muted/70">Connectors</p>
      </div>
      <motion.nav
        className="mt-1 flex flex-col gap-0.5"
        variants={staggerChildren}
        initial={reduce ? false : "hidden"}
        animate="visible"
      >
        {CONNECTORS.map((c) => (
          <motion.div key={c.href} variants={slideUp}>
            <ConnectorItem {...c} onClose={onClose} />
          </motion.div>
        ))}
      </motion.nav>

      <div className="flex-1" />

      {/* ── Bottom nav ────────────────────────────────────────────── */}
      <div className="my-2 h-px bg-white/[0.05]" />
      <nav className="flex flex-col gap-0.5">
        {onNotifToggle && (
          <button
            onClick={onNotifToggle}
            className="flex items-center gap-3 rounded-lg px-3 py-2 type-body text-foreground-muted transition-colors hover:bg-white/[0.035] hover:text-foreground"
          >
            <Bell className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
            <span>Notifications</span>
          </button>
        )}
        {BOTTOM_NAV.map((item) => (
          <NavItem key={item.href} {...item} onClose={onClose} />
        ))}
      </nav>

      {/* ── User ──────────────────────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand/15 type-caption font-semibold text-brand">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate type-body leading-tight text-foreground/85">
                {user.full_name ?? user.email}
              </p>
              {user.full_name && (
                <p className="truncate type-caption leading-tight text-foreground-muted">
                  {user.email}
                </p>
              )}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-52">
          <DropdownMenuLabel className="type-caption">
            <p className="font-medium">{user.full_name ?? user.email}</p>
            {user.full_name && <p className="text-muted-foreground">{user.email}</p>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer type-body text-muted-foreground"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ── Collapsed icon rail ──────────────────────────────────────────── */
function CollapsedRail({ onExpand }: { onExpand: () => void }) {
  const pathname = usePathname();
  const items = [...PRIMARY_NAV];
  return (
    <div className="flex h-full flex-col items-center gap-1 py-4">
      <button
        onClick={onExpand}
        className="relative mb-3 flex h-8 w-8 items-center justify-center"
        aria-label="Expand sidebar"
      >
        <span className="anim-pulse absolute inline-flex h-3 w-3 rounded-full bg-brand/40" />
        <span className="relative inline-flex h-[9px] w-[9px] rounded-full bg-brand shadow-[0_0_10px_2px] shadow-brand/60" />
      </button>
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              isActive ? "bg-white/[0.06] text-brand" : "text-foreground-muted hover:bg-white/[0.035] hover:text-foreground"
            )}
            aria-label={item.label}
          >
            {isActive && (
              <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_8px_1px] shadow-brand/60" />
            )}
            <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.7} />
          </Link>
        );
      })}
      <div className="flex-1" />
      <button
        onClick={onExpand}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-white/[0.035] hover:text-foreground"
        aria-label="Expand sidebar"
      >
        <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </button>
    </div>
  );
}

export function DashboardSidebar({
  isMobileOpen,
  onMobileOpenChange,
  ...rest
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop — expandable layered nav (recessed into the scene) */}
      <aside
        className={cn(
          "relative z-[1] hidden shrink-0 flex-col bg-sidebar/80 transition-[width] duration-200 md:flex",
          "shadow-[inset_-12px_0_24px_-12px_rgba(0,0,0,0.6)] border-r border-white/[0.04]",
          collapsed ? "w-[60px]" : "w-[248px]"
        )}
      >
        {collapsed ? (
          <CollapsedRail onExpand={() => setCollapsed(false)} />
        ) : (
          <SidebarRail {...rest} collapsible onCollapse={() => setCollapsed(true)} />
        )}
      </aside>

      {/* Mobile — full drawer */}
      <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[260px] border-r border-white/[0.06] bg-sidebar p-0">
          <SidebarRail {...rest} onClose={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
