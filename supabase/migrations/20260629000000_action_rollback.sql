-- =============================================================================
-- Sprint 17 — Production Rollback Engine
-- =============================================================================
-- Adds rollback support to the Action Engine. A rollback is a NEW execution that
-- performs the INVERSE provider action (e.g. Resume undoes Pause), linked to the
-- original execution. The original execution is never overwritten — it keeps its
-- state/result/request_payload and only gains rollback linkage columns. The
-- rollback execution carries the rollback lifecycle states.
--
-- Changes (all additive + idempotent):
--   1. New nullable linkage columns on action_executions.
--   2. Extend the state CHECK with rollback_requested / rolling_back /
--      rollback_failed (rolled_back already existed).
--   3. Extend the audit-event CHECK with rollback_requested / rollback_started /
--      rollback_completed / rollback_failed.
--
-- No existing column/row is altered or dropped. Constraints are dropped-then-
-- re-added by name so re-running is safe.
-- =============================================================================

BEGIN;

-- ── 1. Rollback linkage columns ─────────────────────────────────────────────
ALTER TABLE public.action_executions
  -- On a ROLLBACK execution: the original (succeeded) execution it undoes.
  ADD COLUMN IF NOT EXISTS original_execution_id UUID
    REFERENCES public.action_executions(id) ON DELETE SET NULL,
  -- On the ORIGINAL execution: the rollback execution that undid it.
  ADD COLUMN IF NOT EXISTS rollback_execution_id UUID
    REFERENCES public.action_executions(id) ON DELETE SET NULL,
  -- Human reason captured when rollback was requested (on the original).
  ADD COLUMN IF NOT EXISTS rollback_reason TEXT,
  -- When the original was successfully rolled back (on the original).
  ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_action_executions_original
  ON public.action_executions (original_execution_id)
  WHERE original_execution_id IS NOT NULL;

COMMENT ON COLUMN public.action_executions.original_execution_id IS
  'Set on a rollback execution → the original execution it reverses.';
COMMENT ON COLUMN public.action_executions.rollback_execution_id IS
  'Set on the original execution → the rollback execution that reversed it.';
COMMENT ON COLUMN public.action_executions.rollback_reason IS
  'Reason captured when rollback was requested (stored on the original).';
COMMENT ON COLUMN public.action_executions.rolled_back_at IS
  'Timestamp the original execution was successfully rolled back.';

-- ── 2. Extend the execution-state CHECK with the rollback lifecycle ──────────
ALTER TABLE public.action_executions
  DROP CONSTRAINT IF EXISTS action_executions_state_check;
ALTER TABLE public.action_executions
  ADD CONSTRAINT action_executions_state_check CHECK (state IN (
    'not_requested', 'queued', 'validating', 'running',
    'succeeded', 'failed', 'cancelled',
    'rollback_requested', 'rolling_back', 'rolled_back', 'rollback_failed'
  ));

-- ── 3. Extend the audit-event CHECK with rollback events ────────────────────
ALTER TABLE public.action_audit_log
  DROP CONSTRAINT IF EXISTS action_audit_log_event_check;
ALTER TABLE public.action_audit_log
  ADD CONSTRAINT action_audit_log_event_check CHECK (event IN (
    'execute_requested', 'queued', 'validating',
    'execution_started', 'execution_succeeded', 'execution_failed',
    'retry_scheduled', 'cancelled', 'rolled_back', 'dry_run_halted',
    'rollback_requested', 'rollback_started', 'rollback_completed',
    'rollback_failed'
  ));

COMMENT ON TABLE public.action_executions IS
  'Action execution attempts. One row per attempt; deterministic state machine incl. the rollback lifecycle (rollback_requested → rolling_back → rolled_back | rollback_failed). A rollback execution links to its original via original_execution_id; the original is immutable and only gains rollback linkage columns. Per-user-private, workspace-scoped (RLS).';

COMMIT;
