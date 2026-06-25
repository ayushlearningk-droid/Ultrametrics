/**
 * Action Engine — execution feature flag (Sprint 14B.1).
 *
 * Master kill-switch for REAL provider execution. Server-only env var, default
 * OFF. When false (or unset) the executor stays in dry-run: it records attempts
 * and validates, but never calls a provider. When true, enabled adapters may
 * perform their (narrowly scoped) mutations.
 *
 * Read at call time (not module load) so the value is never baked into a build
 * or leaked to the client bundle.
 */

/** True only when ENABLE_ACTION_EXECUTION is explicitly the string "true". */
export function isActionExecutionEnabled(): boolean {
  return process.env.ENABLE_ACTION_EXECUTION === "true";
}
