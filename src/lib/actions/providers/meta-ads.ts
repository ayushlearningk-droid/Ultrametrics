/**
 * Action Engine — Meta Ads provider adapter (Sprint 14B.1).
 *
 * REAL execution for exactly two campaign-level actions: PAUSE_CAMPAIGN and
 * RESUME_CAMPAIGN, via the Meta Marketing API campaign status field. Nothing
 * else is performed here — ad sets, ads, budgets, bids, audiences, creates, and
 * deletes are explicitly refused.
 *
 * Gated by ENABLE_ACTION_EXECUTION: `enabled` is false unless the flag is on, so
 * with the flag off the executor never calls `execute()` and behaviour is
 * unchanged (dry-run). Even when reached, `execute()` re-checks scope and the
 * flag, and refuses anything outside campaign pause/resume.
 *
 *   POST https://graph.facebook.com/<ver>/<campaign_id>
 *        body: status=PAUSED|ACTIVE, access_token=<token>
 *   200 → { success: true }
 */

import type { ActionType } from "@/lib/data/action-queue";
import { META_GRAPH_VERSION } from "@/lib/meta/constants";
import { getActiveMetaToken } from "@/lib/meta/token";
import { isActionExecutionEnabled } from "@/lib/actions/config";
import type { ErrorClass } from "@/lib/actions/retry";
import {
  type ActionProviderAdapter,
  type ActionRequest,
  type ActionContext,
  type ProviderResult,
  type ValidationResult,
} from "@/lib/actions/providers/types";

const SUPPORTED: ReadonlySet<ActionType> = new Set<ActionType>([
  "PAUSE_CAMPAIGN",
  "RESUME_CAMPAIGN",
  "ADJUST_BUDGET",
]);

/** Meta campaign status target for each executable action. */
const STATUS_FOR: Record<"PAUSE_CAMPAIGN" | "RESUME_CAMPAIGN", string> = {
  PAUSE_CAMPAIGN: "PAUSED",
  RESUME_CAMPAIGN: "ACTIVE",
};

/** Map a Meta Graph error / transport failure to a coarse ErrorClass. */
function classifyMetaError(httpStatus: number, metaCode?: number): ErrorClass {
  // Token / permission problems — not retryable (needs reconnect / scope).
  if (httpStatus === 401 || httpStatus === 403) return "auth";
  if (metaCode === 190 || metaCode === 102) return "auth";
  if (metaCode === 200 || metaCode === 10 || metaCode === 3) return "auth";
  // Rate limiting — retryable with backoff.
  if (httpStatus === 429) return "rate_limited";
  if (metaCode === 17 || metaCode === 4 || metaCode === 32 || metaCode === 613) {
    return "rate_limited";
  }
  // Bad request / invalid parameter — retrying won't help.
  if (metaCode === 100) return "validation";
  if (httpStatus >= 400 && httpStatus < 500) return "validation";
  // Server / network — transient, retryable.
  if (httpStatus >= 500) return "transient";
  return "permanent";
}

const RETRYABLE: ReadonlySet<ErrorClass> = new Set(["transient", "rate_limited"]);

export const metaAdsAdapter: ActionProviderAdapter = {
  provider: "meta_ads",

  // Dynamic: real execution only when the master flag is on. With the flag off
  // the executor treats this provider as disabled and stays in dry-run.
  get enabled(): boolean {
    return isActionExecutionEnabled();
  },

  supports(actionType: ActionType): boolean {
    return SUPPORTED.has(actionType);
  },

  validate(request: ActionRequest): ValidationResult {
    const errors: string[] = [];
    if (request.provider !== "meta_ads") errors.push("provider mismatch");
    if (!request.entityId) errors.push("entityId is required");
    if (!SUPPORTED.has(request.actionType)) {
      errors.push(`unsupported action: ${request.actionType}`);
    }
    if (request.actionType === "ADJUST_BUDGET") {
      const minor = (request.params as { daily_budget_minor?: unknown } | null)
        ?.daily_budget_minor;
      if (typeof minor !== "number" || minor <= 0) {
        errors.push("ADJUST_BUDGET requires params.daily_budget_minor > 0");
      }
    }
    return { ok: errors.length === 0, errors };
  },

  async execute(
    request: ActionRequest,
    ctx: ActionContext
  ): Promise<ProviderResult> {
    // Defence in depth — the executor already gates on these, but never trust
    // reaching execute() without re-checking flag + scope.
    if (!isActionExecutionEnabled()) {
      return {
        ok: false,
        errorClass: "permanent",
        errorCode: "execution_disabled",
        errorMessage: "Action execution is disabled",
        retryable: false,
      };
    }
    if (request.entityLevel !== "campaign") {
      return {
        ok: false,
        errorClass: "validation",
        errorCode: "unsupported_entity_level",
        errorMessage: `Only campaign-level actions are supported (got ${request.entityLevel})`,
        retryable: false,
      };
    }
    if (
      request.actionType !== "PAUSE_CAMPAIGN" &&
      request.actionType !== "RESUME_CAMPAIGN"
    ) {
      return {
        ok: false,
        errorClass: "validation",
        errorCode: "unsupported_action",
        errorMessage: `Only PAUSE_CAMPAIGN / RESUME_CAMPAIGN are executable (got ${request.actionType})`,
        retryable: false,
      };
    }

    // Resolve the workspace's active Meta token (workspace-scoped, admin read).
    const token = await getActiveMetaToken(ctx.workspaceId);
    if (token.status !== "ok") {
      return {
        ok: false,
        errorClass: "auth",
        errorCode: `token_${token.status}`,
        errorMessage: `Meta token unavailable: ${token.status}`,
        retryable: false,
      };
    }

    const status = STATUS_FOR[request.actionType];
    const body = new URLSearchParams({
      status,
      access_token: token.accessToken,
    });
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${request.entityId}`;

    let res: Response;
    try {
      res = await fetch(url, { method: "POST", body });
    } catch (err) {
      // Network/transport failure — transient, retryable.
      return {
        ok: false,
        errorClass: "transient",
        errorCode: "network_error",
        errorMessage: err instanceof Error ? err.message : "network error",
        retryable: true,
      };
    }

    // Meta returns a request id header we persist for traceability.
    const providerRequestId =
      res.headers.get("x-fb-request-id") ??
      res.headers.get("x-fb-trace-id") ??
      null;

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const metaError = (json as { error?: { code?: number; message?: string } })
        ?.error;
      const errorClass = classifyMetaError(res.status, metaError?.code);
      return {
        ok: false,
        providerRequestId,
        result: (json as Record<string, unknown> | null) ?? null,
        errorClass,
        errorCode: metaError?.code
          ? `meta_${metaError.code}`
          : `http_${res.status}`,
        errorMessage: metaError?.message ?? `Meta API error (${res.status})`,
        retryable: RETRYABLE.has(errorClass),
      };
    }

    return {
      ok: true,
      providerRequestId,
      result: {
        requested_status: status,
        response: (json as Record<string, unknown> | null) ?? { success: true },
      },
    };
  },
};
