/**
 * AI Employees Runtime — types (Sprint 63H).
 *
 * Contracts for a DETERMINISTIC employee simulation (no LLM, no providers, no
 * backend). Tasks flow through a fixed pipeline of owners; employees derive
 * their live state from the task graph. Pure data.
 */

export type EmployeeId =
  | "ceo"
  | "creative-director"
  | "copywriter"
  | "brand-guardian"
  | "media-buyer"
  | "finance"
  | "automation";

/** The five required live states. */
export type EmployeeStatus = "idle" | "thinking" | "working" | "waiting" | "complete";

export type Confidence = "high" | "medium" | "low";

/** Static identity of an employee. */
export interface EmployeeIdentity {
  id: EmployeeId;
  name: string;
  role: string;
  personality: string;
}

export type TaskStatus = "queued" | "thinking" | "working" | "complete";

/** A unit of work owned by one employee, dependent on prior stages. */
export interface RuntimeTask {
  id: string;
  ownerId: EmployeeId;
  title: string;
  status: TaskStatus;
  /** 0–100. */
  progress: number;
  priority: number;
  dependencies: string[];
  artifact: string;
  confidence?: Confidence;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/** A public message on the conversation bus. */
export interface ConversationMessage {
  id: string;
  fromId: EmployeeId;
  toId: EmployeeId | null;
  text: string;
  at: number;
  taskId: string;
}

export type TimelineKind = "start" | "complete" | "run-complete";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: number;
  employeeId?: EmployeeId;
  taskId?: string;
  text: string;
}

export type RuntimeStatus = "idle" | "running" | "paused" | "complete";

export interface EmployeesState {
  tick: number;
  status: RuntimeStatus;
  tasks: RuntimeTask[];
  messages: ConversationMessage[];
  timeline: TimelineEvent[];
}

/** The live, derived view of one employee (what the UI renders). */
export interface EmployeeView {
  identity: EmployeeIdentity;
  status: EmployeeStatus;
  /** Active/queued tasks owned by this employee. */
  queue: RuntimeTask[];
  /** Messages this employee sent or received. */
  messages: ConversationMessage[];
  /** Timeline events involving this employee. */
  history: TimelineEvent[];
  /** Progress of the active task (0–100). */
  progress: number;
  /** Owners this employee's active task depends on. */
  dependencies: EmployeeId[];
  /** Artifact the active/last task produces. */
  currentArtifact: string | null;
  confidence?: Confidence;
}
