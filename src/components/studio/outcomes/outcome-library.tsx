"use client";

/**
 * Outcome Intelligence Library (Sprint 63T).
 *
 * Production outcome cards — grouped by category — that replace the simple
 * outcome chips. Each card shows expected KPIs, recommended AI employees,
 * estimated duration, deliverables and recommended platforms. Selecting a card
 * populates the Command Center brief automatically (outcome · objective ·
 * audience · platform) via the reused Prompt Composer state. Reuses the Outcome
 * Engine data, the Employees registry, and the media PlatformBadge. Deterministic.
 */

import { Target, Clock, Flag, Package, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/components/studio/media";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useComposer } from "@/components/studio/composer/composer-context";
import { OUTCOME_CATEGORIES, outcomesByCategory, type Outcome } from "./outcomes-data";

function OutcomeCard({ outcome, selected, onSelect }: { outcome: Outcome; selected: boolean; onSelect: () => void }) {
  const Icon = outcome.icon;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "studio-card studio-card-interactive studio-focusable flex flex-col gap-3 p-4 text-left",
        selected && "studio-glow ring-1 ring-brand/40"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="studio-tile flex h-10 w-10 items-center justify-center text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{outcome.label}</p>
          <p className="truncate type-caption text-foreground-muted">{outcome.description}</p>
        </div>
        {selected && <span className="chip chip-emerald">Selected</span>}
      </div>

      {/* Expected KPIs */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 type-caption text-foreground-muted">
          <BarChart3 className="h-3 w-3" /> Expected KPIs
        </span>
        <div className="flex flex-wrap gap-1.5">
          {outcome.kpis.map((k) => (
            <span key={k} className="chip chip-slate">{k}</span>
          ))}
        </div>
      </div>

      {/* Recommended AI Employees */}
      <div className="flex flex-col gap-1">
        <span className="type-caption text-foreground-muted">Recommended team</span>
        <div className="flex flex-wrap gap-1.5">
          {outcome.employees.map((id) => {
            const EmpIcon = EMPLOYEE_ICON[id];
            return (
              <span key={id} className="inline-flex items-center gap-1 chip chip-slate">
                <EmpIcon className="h-3 w-3" /> {employeeName(id)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Duration + platforms */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 type-caption text-foreground-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {outcome.duration}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {outcome.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} className="bg-white/[0.05]" />
          ))}
        </span>
      </div>

      {/* Deliverables */}
      <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-2.5">
        <span className="flex items-center gap-1 type-caption text-foreground-muted">
          <Package className="h-3 w-3" /> Deliverables
        </span>
        <ul className="flex flex-col gap-1">
          {outcome.deliverables.map((d) => (
            <li key={d} className="flex items-start gap-1.5 type-caption text-foreground">
              <Flag className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

export function OutcomeLibrary() {
  const { brief, setField } = useComposer();

  // Selecting an outcome populates the Command Center brief automatically.
  const select = (outcome: Outcome) => {
    setField("outcome", outcome.id);
    setField("objective", outcome.objective);
    setField("audience", outcome.audience);
    setField("platform", outcome.platforms[0]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Target className="h-3.5 w-3.5 text-brand" />
        Outcome Intelligence — pick a result, the team builds the rest
      </div>

      {OUTCOME_CATEGORIES.map((category) => {
        const items = outcomesByCategory(category);
        if (items.length === 0) return null;
        return (
          <section key={category} className="flex flex-col gap-3">
            <h3 className="type-caption font-semibold text-foreground">{category}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((o) => (
                <OutcomeCard
                  key={o.id}
                  outcome={o}
                  selected={brief.outcome === o.id}
                  onSelect={() => select(o)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
