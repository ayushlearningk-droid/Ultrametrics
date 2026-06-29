"use client";

/**
 * AI Studio Home — reusable presentation primitives (Sprint 63 · Home).
 *
 * Every Home section is composed from these — never bespoke markup — so there is
 * no duplicated UI and future modules drop in consistently.
 *   • StudioSection    — labelled section shell (eyebrow + optional action).
 *   • PremiumCard       — the card chassis (glass, optional interactive lift).
 *   • PremiumEmptyState — a calm, on-brand empty state (HIG §18).
 *
 * Presentation only. No business logic.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled section shell with consistent rhythm and an optional trailing action. */
export function StudioSection({
  label,
  description,
  action,
  children,
  className,
}: {
  label: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="type-eyebrow text-foreground-muted">{label}</h2>
          {description && (
            <p className="type-caption text-foreground-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * The shared floating surface (the new "card" — reads as a lifted, intelligent
 * surface, not a boxed card). `interactive` adds the token-based hover lift.
 * All material values come from the Studio 2.0 tokens (.studio-card*).
 */
export function PremiumCard({
  interactive = false,
  className,
  children,
  ...rest
}: {
  interactive?: boolean;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "studio-card overflow-hidden",
        interactive && "studio-card-interactive",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Tokenized loading placeholder. Reduced-motion safe via the token layer. */
export function StudioSkeleton({ className }: { className?: string }) {
  return <div className={cn("studio-skeleton", className)} aria-hidden />;
}

/** A premium, never-boring empty state: ambient tile, one line, optional CTA. */
export function PremiumEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <PremiumCard
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-14 text-center",
        className
      )}
    >
      <div className="studio-tile flex h-12 w-12 items-center justify-center text-foreground-muted">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="type-body font-semibold text-foreground">{title}</p>
        <p className="type-caption text-foreground-muted">{description}</p>
      </div>
      {action}
    </PremiumCard>
  );
}
