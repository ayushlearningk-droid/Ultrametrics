"use client";

/**
 * AI Studio Shell — Left AI Workspace Navigation (Sprint 63I).
 *
 * A slim, icon-first secondary nav for Studio destinations (the HIG "command
 * spine"), distinct from the global app sidebar. Destinations beyond Home are
 * RESERVED placeholders (no screens yet) — disabled, labelled "soon". L1 depth.
 * Presentation + routing only; no business logic.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  LayoutGrid,
  Users,
  Clapperboard,
  Library,
  TrendingUp,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShellRegion } from "./shell-region";

interface NavDestination {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string; // present = live; absent = reserved/disabled
}

const DESTINATIONS: NavDestination[] = [
  { id: "home", label: "Home", icon: Home, href: "/dashboard/studio" },
  { id: "outcomes", label: "Outcomes", icon: Target, href: "/dashboard/studio/outcomes" },
  { id: "canvas", label: "Canvas", icon: LayoutGrid, href: "/dashboard/studio/canvas" },
  { id: "team", label: "AI Team", icon: Users, href: "/dashboard/studio/team" },
  { id: "movie", label: "AI Movie", icon: Clapperboard, href: "/dashboard/studio/movie" },
  { id: "library", label: "Library", icon: Library },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "exports", label: "Exports", icon: Upload },
];

export function StudioNavRail() {
  const pathname = usePathname();

  return (
    <ShellRegion
      id="nav"
      depth="L1"
      as="nav"
      ariaLabel="AI Studio navigation"
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-white/[0.06] py-3"
    >
      {DESTINATIONS.map(({ id, label, icon: Icon, href }) => {
        const active = href ? pathname === href : false;
        const baseClass = cn(
          "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-brand/10 text-brand"
            : "text-foreground-muted hover:bg-white/[0.04] hover:text-foreground"
        );

        const inner = (
          <>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
            {/* Hover label (HIG: expands on hover) */}
            <span className="pointer-events-none absolute left-12 z-20 whitespace-nowrap rounded-md border border-white/[0.08] bg-[hsl(222_44%_6%)] px-2 py-1 type-caption text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {label}
              {!href && <span className="ml-1 text-foreground-muted">· soon</span>}
            </span>
          </>
        );

        if (href) {
          return (
            <Link key={id} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={baseClass}>
              {inner}
            </Link>
          );
        }
        return (
          <span
            key={id}
            aria-label={`${label} (coming soon)`}
            aria-disabled
            className={cn(baseClass, "cursor-default opacity-60")}
          >
            {inner}
          </span>
        );
      })}
    </ShellRegion>
  );
}
