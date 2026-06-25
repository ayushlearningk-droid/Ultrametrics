-- =============================================================================
-- Sprint 14B.1 — Action execution metadata (Meta campaign pause/resume)
-- =============================================================================
-- Adds two first-class columns for REAL execution results, so duration and
-- failure class are queryable rather than buried in the result JSON:
--
--   duration_ms  — wall-clock time the provider call took (executor-measured).
--   error_class  — coarse failure classification for a failed attempt, drawn
--                  from the retry policy's ErrorClass vocabulary.
--
-- The provider request id and response payload already have homes
-- (action_executions.provider_request_id / .result) from Sprint 14A.
--
-- Purely additive: both columns are NULLABLE, no existing column/row is
-- altered, no policy/index/state changes. Idempotent (IF NOT EXISTS).
-- =============================================================================

BEGIN;

ALTER TABLE public.action_executions
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS error_class TEXT;

-- Controlled vocabulary mirrors retry.ts ErrorClass. NULL-permitting so dry-run
-- and successful rows stay valid.
ALTER TABLE public.action_executions
  DROP CONSTRAINT IF EXISTS action_executions_error_class_check;
ALTER TABLE public.action_executions
  ADD CONSTRAINT action_executions_error_class_check
  CHECK (error_class IS NULL OR error_class IN (
    'transient', 'rate_limited', 'auth', 'validation', 'permanent'
  ));

COMMENT ON COLUMN public.action_executions.duration_ms IS
  'Wall-clock duration (ms) of the provider call for this attempt. NULL for dry-run / unstarted.';
COMMENT ON COLUMN public.action_executions.error_class IS
  'Coarse failure classification (retry.ts ErrorClass) for a failed attempt. NULL otherwise.';

COMMIT;
