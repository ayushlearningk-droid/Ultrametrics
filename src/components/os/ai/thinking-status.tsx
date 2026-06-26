"use client";

/**
 * AI Thinking Status (Sprint 36 · timeline Sprint 47).
 *
 * Progressive, HONEST streaming status shown before the answer's text begins.
 * It builds a chronological timeline from the REAL tool phases the model calls
 * (toolPhase, captured from the existing stream events) — never faked progress.
 * Each phase that actually occurs is recorded; completed phases get a check, the
 * active phase gets a spinner. When no tool is active yet it shows a neutral
 * "Understanding your workspace…". Token-only; motion from motion.ts.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { staggerChildren, slideUp } from "@/lib/motion";

/** Real tool → friendly phase label. Only real phases are ever displayed. */
const PHASE_LABEL: Record<string, string> = {
  get_workspace_metrics: "Analyzing campaigns",
  get_provider_metrics: "Analyzing campaigns",
  get_executive_summary: "Summarizing your account",
  get_recommendations: "Building recommendations",
  get_root_cause: "Finding root causes",
  get_change_analysis: "Analyzing what changed",
  remember_fact: "Saving to memory",
};

const BASE_LABEL = "Understanding your workspace";

export function ThinkingStatus({ toolPhase }: { toolPhase?: string | null }) {
  const reduce = useReducedMotion();
  // Ordered, de-duplicated list of the REAL phases seen this turn.
  const [phases, setPhases] = useState<string[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (toolPhase && !seenRef.current.has(toolPhase)) {
      seenRef.current.add(toolPhase);
      setPhases((p) => [...p, toolPhase]);
    }
  }, [toolPhase]);

  // Build the timeline: a base "understanding" step, then each real phase.
  // The active step is the current toolPhase (or the base step when none yet).
  const steps = [
    { key: "__base__", label: BASE_LABEL },
    ...phases.map((p) => ({ key: p, label: PHASE_LABEL[p] ?? "Working" })),
  ];
  const activeKey = toolPhase ?? (phases.length === 0 ? "__base__" : phases[phases.length - 1]);

  return (
    <motion.ul
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="visible"
      className="flex flex-col gap-1.5"
      role="status"
      aria-live="polite"
      aria-label="AI is working"
    >
      {steps.map((s) => {
        const active = s.key === activeKey;
        return (
          <motion.li
            key={s.key}
            variants={slideUp}
            className="flex items-center gap-2 type-caption"
          >
            {active ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand" />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
            )}
            <span className={active ? "text-foreground/90" : "text-foreground-muted"}>
              {s.label}
              {active ? "…" : ""}
            </span>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
