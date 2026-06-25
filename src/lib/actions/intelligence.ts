/**
 * Action Engine — execution intelligence (Sprint 33).
 *
 * A deterministic reasoner over the EXISTING execution telemetry (state,
 * error_class, retryable, attempt_no, dry_run, action_type, rollback linkage).
 * It explains an execution — what happened, why, what changed, whether rollback
 * or retry is recommended, confidence, and the next action — with zero new data,
 * no provider calls, and no mock content. Reuses the retry policy (retry.ts) and
 * the inverse-action mapper (inverse.ts). Pure + client-safe.
 */

import type { ActionExecutionRow } from "@/types/database";
import type { ActionType } from "@/lib/data/action-queue";
import { shouldRetry, MAX_ATTEMPTS, type ErrorClass } from "@/lib/actions/retry";
import { inverseActionType } from "@/lib/actions/inverse";

export interface ExecutionInsight {
  headline: string;
  whatHappened: string;
  whyHappened: string | null;
  whatChanged: string | null;
  rollbackRecommended: boolean;
  rollbackReason: string | null;
  retryRecommended: boolean;
  retryReason: string | null;
  confidence: "high" | "medium" | "low";
  nextAction: string;
}

const ERROR_CLASSES: ReadonlySet<string> = new Set<ErrorClass>([
  "transient",
  "rate_limited",
  "auth",
  "validation",
  "permanent",
]);

/** Human label + cause + remedy for a coarse failure class. */
function classifyFailure(errorClass: string | null): {
  label: string;
  cause: string;
  remedy: string;
} {
  switch (errorClass) {
    case "auth":
      return {
        label: "Authorization",
        cause: "the connected account lacks permission or its token is invalid",
        remedy: "Reconnect the account (and confirm write access) before retrying.",
      };
    case "rate_limited":
      return {
        label: "Rate limited",
        cause: "the provider throttled the request",
        remedy: "Wait and retry shortly — the provider limit should clear.",
      };
    case "validation":
      return {
        label: "Validation",
        cause: "the request parameters were rejected as invalid",
        remedy: "Review the action's parameters; retrying as-is will not help.",
      };
    case "transient":
      return {
        label: "Transient",
        cause: "a temporary provider or network error interrupted the call",
        remedy: "Retry — this is usually momentary.",
      };
    case "permanent":
      return {
        label: "Permanent",
        cause: "the provider returned a non-retryable error",
        remedy: "Investigate the error detail; a retry will not succeed.",
      };
    default:
      return {
        label: "Unknown",
        cause: "the failure could not be classified",
        remedy: "Review the error message before retrying.",
      };
  }
}

/** What the action does to its target, in plain words. */
function effectFor(actionType: ActionType | null): string | null {
  switch (actionType) {
    case "PAUSE_CAMPAIGN":
      return "Campaign status → PAUSED (delivery stops).";
    case "RESUME_CAMPAIGN":
      return "Campaign status → ACTIVE (delivery resumes).";
    case "ADJUST_BUDGET":
      return "Campaign daily budget updated.";
    default:
      return null;
  }
}

/**
 * Derive the execution insight from a row + the originating action's type.
 * `actionType` is the ORIGINAL action; for a rollback execution the effect is
 * its inverse (resolved via the central mapper).
 */
export function explainExecution(
  e: ActionExecutionRow,
  actionType: ActionType | null
): ExecutionInsight {
  const isRollback = e.original_execution_id != null;
  const effectType = isRollback ? inverseActionType(actionType) : actionType;
  const effect = effectFor(effectType);
  const reqId = e.provider_request_id ? ` (provider ref ${e.provider_request_id})` : "";

  // ── Dry run ──
  if (e.dry_run) {
    return {
      headline: "Dry run — validated, not executed",
      whatHappened:
        "The action passed validation but no provider call was made (execution is disabled for this workspace/run).",
      whyHappened: "Provider execution was not enabled, so the engine halted before applying changes.",
      whatChanged: "Nothing — this was a preview only.",
      rollbackRecommended: false,
      rollbackReason: null,
      retryRecommended: false,
      retryReason: null,
      confidence: "high",
      nextAction: "Enable execution for this workspace to apply the action for real.",
    };
  }

  // ── Succeeded (real execution) ──
  if (e.state === "succeeded") {
    const reversible = inverseActionType(actionType) !== null;
    return {
      headline: "Executed successfully",
      whatHappened: `The provider confirmed the change${reqId}.`,
      whyHappened: null,
      whatChanged: effect,
      rollbackRecommended: false,
      rollbackReason: reversible
        ? "Succeeded as intended. Rollback is available if you need to revert."
        : "This action type cannot be automatically reversed.",
      retryRecommended: false,
      retryReason: null,
      confidence: "high",
      nextAction: "Monitor performance over the next cycle; no further action needed.",
    };
  }

  // ── Rolled back ──
  if (e.state === "rolled_back") {
    return {
      headline: "Rolled back",
      whatHappened: `The inverse action was applied to revert the original execution${reqId}.`,
      whyHappened: e.rollback_reason ?? null,
      whatChanged: effect,
      rollbackRecommended: false,
      rollbackReason: "Already rolled back.",
      retryRecommended: false,
      retryReason: null,
      confidence: "high",
      nextAction: "The original change has been reverted; no further action needed.",
    };
  }

  // ── Failed / rollback_failed ──
  if (e.state === "failed" || e.state === "rollback_failed") {
    const cls = e.error_class && ERROR_CLASSES.has(e.error_class) ? e.error_class : null;
    const f = classifyFailure(cls);
    const attempt = e.attempt_no ?? 1;
    const canRetry =
      cls != null ? shouldRetry(cls as ErrorClass, attempt) : false;
    const isRollbackFail = e.state === "rollback_failed";
    return {
      headline: `${isRollbackFail ? "Rollback failed" : "Execution failed"} — ${f.label.toLowerCase()}`,
      whatHappened: e.error_message
        ? e.error_message
        : `The ${isRollbackFail ? "rollback" : "execution"} did not complete.`,
      whyHappened: `Classified as "${f.label}": ${f.cause}.`,
      whatChanged: "No change was applied (the operation is atomic — a failure leaves the target untouched).",
      rollbackRecommended: false,
      rollbackReason: "Nothing was applied, so there is nothing to roll back.",
      retryRecommended: canRetry,
      retryReason: canRetry
        ? `Retryable error and attempt ${attempt} of ${MAX_ATTEMPTS}. ${f.remedy}`
        : f.remedy,
      confidence: cls ? "high" : "medium",
      nextAction: f.remedy,
    };
  }

  // ── In progress (queued / validating / running / rollback states) ──
  return {
    headline: "In progress",
    whatHappened: `The execution is currently "${e.state}".`,
    whyHappened: null,
    whatChanged: null,
    rollbackRecommended: false,
    rollbackReason: null,
    retryRecommended: false,
    retryReason: null,
    confidence: "medium",
    nextAction: "Wait for the execution to reach a terminal state.",
  };
}
