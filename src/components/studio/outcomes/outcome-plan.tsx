"use client";

/**
 * Outcome Engine — assembled plan (Sprint 63J).
 *
 * Renders the deterministic plan the OS assembles for the chosen outcome:
 * Brand → Competitors → Audience → Hooks → Scripts → Storyboards → Images →
 * Videos → Voice → Captions → Landing Page → Publishing → Analytics — each step
 * owned by an AI employee. Hands off to the AI Movie to watch the team build it.
 * Studio 2.0 tokens; reduced-motion safe.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Clapperboard } from "lucide-react";
import { staggerChildren, slideUp } from "@/lib/motion";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useOutcome } from "./outcome-engine";

export function OutcomePlan() {
  const { outcome, plan, clear } = useOutcome();
  const reduce = useReducedMotion();
  if (!outcome) return null;
  const OutcomeIcon = outcome.icon;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="studio-tile flex h-12 w-12 items-center justify-center text-brand">
            <OutcomeIcon className="h-5 w-5" />
          </div>
          <div>
            <span className="type-eyebrow text-foreground-muted">Plan assembled for</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{outcome.label}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="studio-focusable flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-3 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Choose another
          </button>
          <Link
            href="/dashboard/studio/movie"
            className="studio-focusable flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] bg-brand/15 px-3 py-1.5 type-caption font-semibold text-brand transition-colors hover:bg-brand/25"
          >
            <Clapperboard className="h-3.5 w-3.5" /> Watch the team build it
          </Link>
        </div>
      </div>

      {/* Plan chain */}
      <motion.ol
        className="flex flex-col gap-3"
        variants={staggerChildren}
        initial={reduce ? false : "hidden"}
        animate="visible"
      >
        {plan.map((step, i) => {
          const StepIcon = step.icon;
          const OwnerIcon = EMPLOYEE_ICON[step.ownerId];
          return (
            <motion.li key={step.id} variants={slideUp} className="studio-card flex items-center gap-4 p-4">
              <span className="w-6 shrink-0 text-center type-caption tabular-nums text-foreground-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="studio-tile flex h-10 w-10 shrink-0 items-center justify-center text-foreground-muted">
                <StepIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="type-body font-semibold text-foreground">{step.label}</p>
                <p className="truncate type-caption text-foreground-muted">{step.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-[var(--studio-radius-sm)] bg-white/[0.03] px-2 py-1">
                <OwnerIcon className="h-3.5 w-3.5 text-foreground-muted" />
                <span className="type-caption text-foreground-muted">{employeeName(step.ownerId)}</span>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </div>
  );
}
