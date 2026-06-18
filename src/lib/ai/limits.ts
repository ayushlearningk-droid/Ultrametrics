/**
 * Ask Ultrametrics — cost governance (Phase 1, in-memory + observe-mode).
 *
 * Plan-derived limits and per-workspace rate / concurrency enforcement, held in
 * module-singleton memory (no DB this phase — same best-effort, per-instance
 * model as the metrics cache). Usage is logged to the console for tuning. The
 * monthly token budget is tracked here only as a number to read; persistent
 * monthly accounting lands in Phase 2 with the ai_usage_* tables.
 *
 * Kill-switch AI_ENFORCE: defaults to ENFORCED; only the literal string "false"
 * switches to observe-mode (limit breaches are logged, not blocked). Phase 1
 * runs with AI_ENFORCE=false.
 */

export interface PlanLimits {
  /** Informational monthly token budget (enforced in Phase 2). */
  monthlyTokenBudget: number;
  /** Requests per minute, per workspace. */
  rpm: number;
  /** Max concurrent in-flight streams, per workspace. */
  maxConcurrent: number;
  /** Whether Opus escalation is permitted on this plan. */
  opusAllowed: boolean;
}

const DEFAULT_LIMITS: PlanLimits = {
  monthlyTokenBudget: 500_000,
  rpm: 10,
  maxConcurrent: 2,
  opusAllowed: false, // starter is Sonnet-only
};

/** Plan id → limits. Plan ids mirror subscriptions.plan_id. */
const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: DEFAULT_LIMITS,
  pro: {
    monthlyTokenBudget: 5_000_000,
    rpm: 30,
    maxConcurrent: 4,
    opusAllowed: true,
  },
  scale: {
    monthlyTokenBudget: 25_000_000,
    rpm: 60,
    maxConcurrent: 8,
    opusAllowed: true,
  },
};

export function getPlanLimits(planId: string | null | undefined): PlanLimits {
  if (planId && planId in PLAN_LIMITS) return PLAN_LIMITS[planId];
  return DEFAULT_LIMITS;
}

/** Enforced unless AI_ENFORCE is the literal trimmed string "false". */
export function aiEnforced(): boolean {
  return process.env.AI_ENFORCE?.trim().toLowerCase() !== "false";
}

export interface GateResult {
  ok: boolean;
  reason?: string;
}

// ── Rate limiting (sliding 60s window, per workspace) ───────────────────────
const RATE_WINDOW_MS = 60_000;
const requestTimestamps = new Map<string, number[]>();

export function checkRateLimit(
  workspaceId: string,
  limits: PlanLimits
): GateResult {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (requestTimestamps.get(workspaceId) ?? []).filter(
    (t) => t > cutoff
  );

  if (recent.length >= limits.rpm) {
    requestTimestamps.set(workspaceId, recent);
    return { ok: false, reason: `rate limit ${limits.rpm}/min exceeded` };
  }

  recent.push(now);
  requestTimestamps.set(workspaceId, recent);
  return { ok: true };
}

// ── Concurrency (in-flight streams, per workspace) ──────────────────────────
const activeStreams = new Map<string, number>();

export function acquireConcurrencySlot(
  workspaceId: string,
  limits: PlanLimits
): GateResult {
  const active = activeStreams.get(workspaceId) ?? 0;
  if (active >= limits.maxConcurrent) {
    return { ok: false, reason: `concurrency limit ${limits.maxConcurrent} reached` };
  }
  activeStreams.set(workspaceId, active + 1);
  return { ok: true };
}

export function releaseConcurrencySlot(workspaceId: string): void {
  const active = activeStreams.get(workspaceId) ?? 0;
  if (active <= 1) activeStreams.delete(workspaceId);
  else activeStreams.set(workspaceId, active - 1);
}

// ── Usage logging (console; DB rollup is Phase 2) ───────────────────────────
export interface UsageLogEntry {
  workspaceId: string;
  userId: string;
  model: string;
  escalated: boolean;
  routeReason: string;
  inputTokens: number;
  outputTokens: number;
  toolRounds: number;
  stopReason: string | null;
}

export function logUsage(entry: UsageLogEntry): void {
  console.log("[ai.usage]", JSON.stringify(entry));
}
