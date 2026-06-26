/**
 * AI Generation Engine — queue foundation (Sprint 52).
 *
 * A pure, deterministic generation queue. It tracks jobs and enforces the legal
 * status lifecycle — it NEVER executes a generation, calls a provider, or
 * produces media. Enqueue order + auto ids are deterministic. No I/O.
 *
 * Lifecycle:  queued → running → completed | failed
 *             queued/running → cancelled
 *             completed | failed | cancelled = terminal
 */

import type {
  GenerationJob,
  GenerationRequest,
  GenerationStatus,
} from "./types";

const TRANSITIONS: Record<GenerationStatus, GenerationStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransition(
  from: GenerationStatus,
  to: GenerationStatus
): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface TransitionResult {
  ok: boolean;
  job: GenerationJob;
  reason?: string;
}

export class GenerationQueue {
  private readonly jobs = new Map<string, GenerationJob>();
  private counter = 0;

  /** Enqueue a request as a new `queued` job. Ids are deterministic: gen-0,1,… */
  enqueue(request: GenerationRequest): GenerationJob {
    const id = `gen-${this.counter++}`;
    const job: GenerationJob = {
      id,
      request,
      status: "queued",
      createdAtIndex: this.counter - 1,
    };
    this.jobs.set(id, job);
    return { ...job };
  }

  get(id: string): GenerationJob | undefined {
    const job = this.jobs.get(id);
    return job ? { ...job } : undefined;
  }

  list(): GenerationJob[] {
    return [...this.jobs.values()]
      .sort((a, b) => a.createdAtIndex - b.createdAtIndex)
      .map((j) => ({ ...j }));
  }

  listByStatus(status: GenerationStatus): GenerationJob[] {
    return this.list().filter((j) => j.status === status);
  }

  /** Attempt a status transition. Pure outcome — only mutates on a legal move. */
  transition(id: string, to: GenerationStatus): TransitionResult {
    const current = this.jobs.get(id);
    if (!current) {
      return {
        ok: false,
        job: {
          id,
          request: {} as GenerationRequest,
          status: "failed",
          createdAtIndex: -1,
        },
        reason: `Unknown job: ${id}`,
      };
    }
    if (!canTransition(current.status, to)) {
      return {
        ok: false,
        job: { ...current },
        reason: `Illegal transition: ${current.status} → ${to}.`,
      };
    }
    const next: GenerationJob = { ...current, status: to };
    this.jobs.set(id, next);
    return { ok: true, job: { ...next } };
  }

  /** Convenience helpers. */
  markRunning(id: string): TransitionResult {
    return this.transition(id, "running");
  }
  markCompleted(id: string): TransitionResult {
    return this.transition(id, "completed");
  }
  markFailed(id: string): TransitionResult {
    return this.transition(id, "failed");
  }
  cancel(id: string): TransitionResult {
    return this.transition(id, "cancelled");
  }
}
