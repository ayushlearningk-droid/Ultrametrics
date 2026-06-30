"use client";

/** Production Approval Center — ReviewerBadge (Sprint 63). Reuses Employees. */

import { cn } from "@/lib/utils";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import type { EmployeeId } from "@/components/studio/employees/types";

export function ReviewerBadge({ id, className }: { id: EmployeeId; className?: string }) {
  const Icon = EMPLOYEE_ICON[id];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[var(--studio-radius-sm)] bg-white/[0.04] px-1.5 py-0.5 type-caption text-foreground-muted", className)}>
      <Icon className="h-3 w-3" />
      Reviewer · {employeeName(id)}
    </span>
  );
}
