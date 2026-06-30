"use client";

/**
 * Production Asset Inspector — InspectorSection + Row (Sprint 63).
 * The reusable section chassis every inspector block composes from. Token-based.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InspectorSection({
  icon,
  title,
  action,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("studio-card flex flex-col gap-3 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 type-eyebrow text-foreground-muted">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InspectorRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="type-caption text-foreground-muted">{label}</span>
      <span className="min-w-0 truncate text-right type-caption font-semibold text-foreground/90">{value}</span>
    </div>
  );
}
