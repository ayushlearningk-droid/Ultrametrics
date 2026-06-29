/**
 * AI Employees Runtime — deterministic simulation (Sprint 63H).
 *
 * Pure reducer: a TICK advances the active stage through queued → thinking →
 * working → complete, emitting bus messages + timeline events and handing off to
 * the next owner. No LLM, no randomness — the sequence is fully scripted by the
 * PIPELINE. Timestamps are display metadata only (clock, not logic).
 *
 * Employee live state is DERIVED from the task graph (employeeView), so the UI
 * never stores employee status separately.
 */

import { EMPLOYEES, PIPELINE } from "./employees-data";
import type {
  EmployeeId,
  EmployeeStatus,
  EmployeeView,
  EmployeesState,
  RuntimeTask,
} from "./types";

let seq = 0;
const uid = (p: string) => `${p}-${seq++}`;
const now = () => Date.now();

export type RuntimeAction =
  | { type: "TICK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESET" };

/** Fresh state: every stage queued; the first stage has no dependencies. */
export function initState(): EmployeesState {
  seq = 0;
  const t0 = now();
  const tasks: RuntimeTask[] = PIPELINE.map((s, i) => ({
    id: s.id,
    ownerId: s.ownerId,
    title: s.title,
    status: "queued",
    progress: 0,
    priority: s.priority,
    dependencies: i === 0 ? [] : [PIPELINE[i - 1].id],
    artifact: s.artifact,
    confidence: s.confidence,
    createdAt: t0,
  }));
  return { tick: 0, status: "running", tasks, messages: [], timeline: [] };
}

function depsComplete(tasks: RuntimeTask[], task: RuntimeTask): boolean {
  return task.dependencies.every((d) => tasks.find((t) => t.id === d)?.status === "complete");
}

export function reducer(state: EmployeesState, action: RuntimeAction): EmployeesState {
  switch (action.type) {
    case "PAUSE":
      return state.status === "running" ? { ...state, status: "paused" } : state;
    case "RESUME":
      return state.status === "paused" ? { ...state, status: "running" } : state;
    case "RESET":
      return initState();
    case "TICK": {
      if (state.status !== "running") return state;

      const idx = state.tasks.findIndex(
        (t) => t.status !== "complete" && depsComplete(state.tasks, t)
      );
      if (idx < 0) {
        return {
          ...state,
          tick: state.tick + 1,
          status: "complete",
          timeline: [
            ...state.timeline,
            { id: uid("ev"), kind: "run-complete", at: now(), text: "Campaign complete." },
          ],
        };
      }

      const stage = PIPELINE[idx];
      const task = state.tasks[idx];
      const tasks = [...state.tasks];
      let messages = state.messages;
      let timeline = state.timeline;

      if (task.status === "queued") {
        tasks[idx] = { ...task, status: "thinking", startedAt: now() };
        timeline = [
          ...timeline,
          { id: uid("ev"), kind: "start", at: now(), employeeId: task.ownerId, taskId: task.id, text: `${stage.title} started` },
        ];
      } else if (task.status === "thinking") {
        // Begin work + announce on the bus (routed to the next owner).
        tasks[idx] = { ...task, status: "working" };
        const nextOwner: EmployeeId | null = PIPELINE[idx + 1]?.ownerId ?? null;
        messages = [
          ...messages,
          { id: uid("msg"), fromId: task.ownerId, toId: nextOwner, text: stage.message, at: now(), taskId: task.id },
        ];
      } else {
        // working → advance progress, then complete + hand off.
        const step = 100 / Math.max(1, stage.durationTicks);
        const progress = Math.min(100, task.progress + step);
        if (progress >= 100) {
          tasks[idx] = { ...task, status: "complete", progress: 100, completedAt: now() };
          timeline = [
            ...timeline,
            { id: uid("ev"), kind: "complete", at: now(), employeeId: task.ownerId, taskId: task.id, text: `${stage.title} complete` },
          ];
        } else {
          tasks[idx] = { ...task, progress };
        }
      }

      const allComplete = tasks.every((t) => t.status === "complete");
      return {
        ...state,
        tick: state.tick + 1,
        tasks,
        messages,
        timeline: allComplete
          ? [...timeline, { id: uid("ev"), kind: "run-complete", at: now(), text: "Campaign complete." }]
          : timeline,
        status: allComplete ? "complete" : "running",
      };
    }
    default:
      return state;
  }
}

/* ── Derived employee views ──────────────────────────────────────────────── */
export function employeeView(state: EmployeesState, id: EmployeeId): EmployeeView {
  const identity = EMPLOYEES.find((e) => e.id === id)!;
  const owned = state.tasks.filter((t) => t.ownerId === id);
  const active = owned.find((t) => t.status === "working" || t.status === "thinking");
  const lastComplete = [...owned].reverse().find((t) => t.status === "complete");

  let status: EmployeeStatus;
  if (active) status = active.status === "thinking" ? "thinking" : "working";
  else if (owned.some((t) => t.status === "queued" && !depsComplete(state.tasks, t))) status = "waiting";
  else if (owned.length > 0 && owned.every((t) => t.status === "complete")) status = "complete";
  else if (owned.some((t) => t.status === "queued")) status = "waiting";
  else status = "idle";

  const refTask = active ?? lastComplete ?? owned[0];

  return {
    identity,
    status,
    queue: owned.filter((t) => t.status !== "complete"),
    messages: state.messages.filter((m) => m.fromId === id || m.toId === id),
    history: state.timeline.filter((e) => e.employeeId === id),
    progress: active ? active.progress : owned.length > 0 && owned.every((t) => t.status === "complete") ? 100 : 0,
    dependencies: (refTask?.dependencies ?? [])
      .map((d) => state.tasks.find((t) => t.id === d)?.ownerId)
      .filter((x): x is EmployeeId => Boolean(x)),
    currentArtifact: refTask?.artifact ?? null,
    confidence: refTask?.confidence,
  };
}

export function allEmployeeViews(state: EmployeesState): EmployeeView[] {
  return EMPLOYEES.map((e) => employeeView(state, e.id));
}
