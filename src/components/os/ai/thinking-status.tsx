"use client";

/**
 * AI Thinking Status (Sprint 36).
 *
 * Progressive, HONEST streaming status shown before the answer's text begins —
 * driven by the real tool the model is calling (toolPhase, captured from the
 * existing stream events). No faked phases: when no tool is active it shows a
 * neutral "Understanding your workspace…". Token-only; motion from motion.ts.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { fadeIn } from "@/lib/motion";

/** Real tool → friendly phase label. */
const PHASE_LABEL: Record<string, string> = {
  get_workspace_metrics: "Analyzing campaigns…",
  get_provider_metrics: "Analyzing campaigns…",
  get_executive_summary: "Summarizing your account…",
  get_recommendations: "Building recommendations…",
  get_root_cause: "Finding root causes…",
  get_change_analysis: "Analyzing what changed…",
  remember_fact: "Saving to memory…",
};

export function ThinkingStatus({ toolPhase }: { toolPhase?: string | null }) {
  const reduce = useReducedMotion();
  const label = toolPhase
    ? (PHASE_LABEL[toolPhase] ?? "Working…")
    : "Understanding your workspace…";

  return (
    <motion.div
      variants={fadeIn}
      initial={reduce ? false : "hidden"}
      animate="visible"
      className="flex items-center gap-2 type-caption text-foreground-muted"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
      <span>{label}</span>
    </motion.div>
  );
}
