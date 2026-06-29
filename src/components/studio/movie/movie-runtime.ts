/**
 * AI Movie Runtime — pure derivation (Sprint 63I).
 *
 * Derives a CINEMATIC view (stages, current worker, execution path, ETA,
 * artifact, confidence) from the deterministic AI Employees Runtime (Sprint
 * 63H). Read-only over PIPELINE + EmployeesState — it does NOT modify the
 * employees runtime. No spinners, no progress bars; ETA replaces them.
 */

import { PIPELINE } from "@/components/studio/employees/employees-data";
import type {
  Confidence,
  EmployeeId,
  EmployeesState,
  RuntimeStatus,
  TimelineEvent,
} from "@/components/studio/employees/types";

/** Must match the employees runtime tick cadence (presentation estimate only). */
export const MOVIE_TICK_MS = 600;

/** Cinematic action labels per stage (gerunds — what the worker is doing). */
export const MOVIE_LABEL: Record<string, string> = {
  "s-brief": "Planning strategy…",
  "s-hook": "Finding references…",
  "s-script": "Writing the hook…",
  "s-brand": "Checking brand…",
  "s-forecast": "Predicting CTR…",
  "s-budget": "Approving budget…",
  "s-render": "Rendering…",
};

export type MovieStageStatus = "finished" | "current" | "upcoming";

export interface MovieStage {
  id: string;
  ownerId: EmployeeId;
  label: string;
  status: MovieStageStatus;
}

export type MovieEvent = TimelineEvent;

export interface MovieState {
  status: RuntimeStatus;
  stages: MovieStage[];
  currentStageId: string | null;
  finishedIds: string[];
  upcomingIds: string[];
  /** Owner currently working (spotlight), or null when none. */
  currentOwnerId: EmployeeId | null;
  /** Next owner to receive the handoff, or null. */
  nextOwnerId: EmployeeId | null;
  artifact: string | null;
  confidence?: Confidence;
  /** Estimated time remaining, ms (replaces the progress bar). */
  etaMs: number;
  /** Whether thinking (vs working) — drives the spotlight motion. */
  isThinking: boolean;
}

function remainingTicks(state: EmployeesState): number {
  let r = 0;
  for (const s of PIPELINE) {
    const t = state.tasks.find((x) => x.id === s.id);
    if (!t || t.status === "complete") continue;
    const step = 100 / Math.max(1, s.durationTicks);
    if (t.status === "working") r += Math.ceil((100 - t.progress) / step);
    else if (t.status === "thinking") r += 1 + s.durationTicks;
    else r += 2 + s.durationTicks;
  }
  return r;
}

/** Build the movie view from the employees runtime state. Pure. */
export function buildMovie(state: EmployeesState): MovieState {
  const stages: MovieStage[] = PIPELINE.map((s) => {
    const t = state.tasks.find((x) => x.id === s.id);
    const status: MovieStageStatus =
      !t || t.status === "queued"
        ? "upcoming"
        : t.status === "complete"
          ? "finished"
          : "current";
    return { id: s.id, ownerId: s.ownerId, label: MOVIE_LABEL[s.id] ?? s.title, status };
  });

  const currentIdx = stages.findIndex((s) => s.status === "current");
  const current = currentIdx >= 0 ? stages[currentIdx] : null;
  const currentTask = current ? state.tasks.find((t) => t.id === current.id) : undefined;
  const next = currentIdx >= 0 ? stages[currentIdx + 1] ?? null : null;

  return {
    status: state.status,
    stages,
    currentStageId: current?.id ?? null,
    finishedIds: stages.filter((s) => s.status === "finished").map((s) => s.id),
    upcomingIds: stages.filter((s) => s.status === "upcoming").map((s) => s.id),
    currentOwnerId: current?.ownerId ?? null,
    nextOwnerId: next?.ownerId ?? null,
    artifact: currentTask?.artifact ?? null,
    confidence: currentTask?.confidence,
    etaMs: remainingTicks(state) * MOVIE_TICK_MS,
    isThinking: currentTask?.status === "thinking",
  };
}

/** Movie events = the runtime timeline (read-only passthrough). */
export function buildMovieEvents(state: EmployeesState): MovieEvent[] {
  return state.timeline;
}

/** Format an ms ETA as a compact label. */
export function formatEta(ms: number): string {
  if (ms <= 0) return "wrapping up";
  const s = Math.ceil(ms / 1000);
  return `≈ ${s}s remaining`;
}
