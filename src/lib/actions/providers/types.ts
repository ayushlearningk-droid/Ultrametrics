/**
 * Action Engine — provider adapter contract (Sprint 14A).
 *
 * The WRITE-side counterpart to the read-only ConnectorMetricsAdapter
 * (src/lib/metrics/types.ts). Every executable provider (Meta Ads, Google Ads,
 * future) implements this so the executor stays provider-agnostic: adding a
 * provider means adding one adapter + registering it, with no executor change.
 *
 * Sprint 14A is DRY-RUN ONLY. The adapters that implement this interface are
 * stubs: `enabled` is false and `execute()` refuses. The executor checks
 * `enabled` and halts BEFORE ever calling `execute()`, so no provider code runs.
 */

import type { ActionType, ActionEntityLevel } from "@/lib/data/action-queue";
import type { ErrorClass } from "@/lib/actions/retry";

/** The structured, validated request the executor hands to an adapter. */
export interface ActionRequest {
  provider: string;
  entityLevel: ActionEntityLevel;
  entityId: string;
  actionType: ActionType;
  params: Record<string, unknown> | null;
}

/** Per-attempt context (credentials are resolved by the executor, not here). */
export interface ActionContext {
  workspaceId: string;
  connectorId: string | null;
  actorUserId: string;
  /** Idempotency key echoed to the provider so a retry is not double-applied. */
  idempotencyKey: string;
  /** Always true in Sprint 14A. */
  dryRun: boolean;
}

/** Normalized outcome of an attempted provider mutation. */
export interface ProviderResult {
  ok: boolean;
  providerRequestId?: string | null;
  result?: Record<string, unknown> | null;
  errorCode?: string;
  errorMessage?: string;
  /** Coarse failure classification (drives retry eligibility). */
  errorClass?: ErrorClass;
  retryable?: boolean;
}

/** Result of static validation — never touches the network. */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Contract every action provider adapter implements. In Sprint 14A only
 * `provider`, `enabled`, `supports`, and `validate` are exercised; `execute`
 * exists for shape completeness but is never invoked while `enabled` is false.
 */
export interface ActionProviderAdapter {
  readonly provider: string;
  /** False until provider execution is enabled in a later sprint. */
  readonly enabled: boolean;
  /** Whether this adapter can perform the given action type. */
  supports(actionType: ActionType): boolean;
  /** Static, offline validation of the request shape (no network). */
  validate(request: ActionRequest): ValidationResult;
  /** Perform the mutation. Guarded by `enabled`; throws while disabled. */
  execute(request: ActionRequest, ctx: ActionContext): Promise<ProviderResult>;
}

/** Thrown by a disabled stub adapter if `execute` is ever reached. */
export class ProviderExecutionNotEnabledError extends Error {
  constructor(readonly provider: string) {
    super(`Provider execution is not enabled for "${provider}"`);
    this.name = "ProviderExecutionNotEnabledError";
  }
}
