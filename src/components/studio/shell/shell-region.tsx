"use client";

/**
 * AI Studio Shell — reusable region & slot primitives (Sprint 63I).
 *
 * Every region in the shell is composed from these primitives — never bespoke
 * markup — so regions are independently replaceable and visually consistent.
 *   • ShellRegion — a depth-tagged landmark container (data-region / data-depth
 *     for future detach/split/drag tooling).
 *   • ReservedSlot — a labelled empty placeholder reserving a future module.
 *
 * Presentation only. No business logic.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ShellDepth, StudioRegionId } from "./regions";

type Landmark = "nav" | "main" | "aside" | "section" | "header" | "footer";

interface ShellRegionProps {
  id: StudioRegionId;
  depth: ShellDepth;
  as?: Landmark;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

/** A depth-tagged, landmarked shell region container. */
export function ShellRegion({
  id,
  depth,
  as = "section",
  ariaLabel,
  className,
  children,
}: ShellRegionProps) {
  const common = {
    "data-region": id,
    "data-depth": depth,
    "aria-label": ariaLabel,
    className: cn("min-w-0", className),
  } as const;

  switch (as) {
    case "nav":
      return <nav {...common}>{children}</nav>;
    case "main":
      return <main {...common}>{children}</main>;
    case "aside":
      return <aside {...common}>{children}</aside>;
    case "header":
      return <header {...common}>{children}</header>;
    case "footer":
      return <footer {...common}>{children}</footer>;
    default:
      return <section {...common}>{children}</section>;
  }
}

/**
 * A labelled placeholder reserving a future module's space. Calm, on-brand, and
 * clearly "reserved" — never an empty void (HIG §18). No interactions.
 */
export function ReservedSlot({
  label,
  icon,
  hint,
  className,
}: {
  label: string;
  icon?: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      data-reserved-slot={label}
      className={cn(
        "studio-reserved flex flex-col items-center justify-center gap-1.5 px-4 py-6 text-center",
        className
      )}
    >
      {icon && (
        <div className="studio-tile flex h-8 w-8 items-center justify-center text-foreground-muted">
          {icon}
        </div>
      )}
      <p className="type-caption font-semibold text-foreground/80">{label}</p>
      {hint && <p className="type-caption text-foreground-muted">{hint}</p>}
    </div>
  );
}
