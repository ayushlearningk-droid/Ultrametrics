"use client";

/**
 * Production Asset Inspector — InspectorOwnership (Sprint 63).
 * Reuses the Employees registry for the owning AI employee.
 */

import { Users } from "lucide-react";
import { EMPLOYEES, EMPLOYEE_ICON } from "@/components/studio/employees/employees-data";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection } from "./inspector-section";

export function InspectorOwnership({ item }: { item: CreativeItem }) {
  const owner = EMPLOYEES.find((e) => e.id === item.ownerId);
  const Icon = EMPLOYEE_ICON[item.ownerId];
  return (
    <InspectorSection icon={<Users className="h-3.5 w-3.5 text-brand" />} title="AI employee ownership">
      <div className="flex items-center gap-2.5">
        <div className="studio-tile flex h-10 w-10 items-center justify-center text-foreground-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{owner?.name}</p>
          <p className="truncate type-caption text-foreground-muted">{owner?.role}</p>
        </div>
        <span className="chip chip-emerald">Owner</span>
      </div>
    </InspectorSection>
  );
}
