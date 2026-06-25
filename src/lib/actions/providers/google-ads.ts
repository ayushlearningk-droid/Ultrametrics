/**
 * Action Engine — Google Ads provider adapter (Sprint 14A STUB).
 *
 * Declares the Google Ads write surface so the registry and executor are
 * complete, but performs NO mutation: `enabled` is false and `execute()`
 * refuses. No Google Ads API call is made anywhere in this file. Real execution
 * arrives in a later sprint, gated on Google Ads write scope + a developer token
 * with mutate access.
 */

import type { ActionType } from "@/lib/data/action-queue";
import {
  type ActionProviderAdapter,
  type ActionRequest,
  type ActionContext,
  type ProviderResult,
  type ValidationResult,
  ProviderExecutionNotEnabledError,
} from "@/lib/actions/providers/types";

const SUPPORTED: ReadonlySet<ActionType> = new Set<ActionType>([
  "PAUSE_CAMPAIGN",
  "RESUME_CAMPAIGN",
  "ADJUST_BUDGET",
]);

export const googleAdsAdapter: ActionProviderAdapter = {
  provider: "google_ads",
  enabled: false,

  supports(actionType: ActionType): boolean {
    return SUPPORTED.has(actionType);
  },

  validate(request: ActionRequest): ValidationResult {
    const errors: string[] = [];
    if (request.provider !== "google_ads") errors.push("provider mismatch");
    if (!request.entityId) errors.push("entityId is required");
    if (!SUPPORTED.has(request.actionType)) {
      errors.push(`unsupported action: ${request.actionType}`);
    }
    if (request.actionType === "ADJUST_BUDGET") {
      const micros = (request.params as { budget_micros?: unknown } | null)
        ?.budget_micros;
      if (typeof micros !== "number" || micros <= 0) {
        errors.push("ADJUST_BUDGET requires params.budget_micros > 0");
      }
    }
    return { ok: errors.length === 0, errors };
  },

  async execute(
    _request: ActionRequest,
    _ctx: ActionContext
  ): Promise<ProviderResult> {
    // Sprint 14A: never reached — the executor halts on `enabled === false`.
    throw new ProviderExecutionNotEnabledError("google_ads");
  },
};
