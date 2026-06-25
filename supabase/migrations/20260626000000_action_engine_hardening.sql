-- =============================================================================
-- Sprint 14A.1 — Action Engine production hardening
-- =============================================================================
-- Two additive, non-destructive hardening changes on the Sprint 14A foundation:
--
--   1. Idempotency — add action_executions.idempotency_key with a partial UNIQUE
--      index, so a repeated POST /execute resolves the SAME execution row
--      instead of creating a duplicate attempt (and a duplicate audit trail).
--
--   2. Audit immutability — FORCE ROW LEVEL SECURITY on action_audit_log, so the
--      append-only guarantee holds even for the table-owner role (RLS otherwise
--      does not constrain the owner). Existing policies are unchanged.
--
-- Purely additive: no column is dropped or repopulated, no policy is altered.
-- The new column is NULLABLE and the unique index is PARTIAL (WHERE NOT NULL),
-- so existing rows (which have a NULL key) never collide — safe on a populated
-- production database. Idempotent (IF NOT EXISTS guards).
-- =============================================================================

BEGIN;

-- ── 1. Idempotency key on execution attempts ────────────────────────────────
ALTER TABLE public.action_executions
  -- Deterministic dedupe key for an attempt. Sprint 14A.1 uses one dry-run
  -- attempt per action ("dryrun:<action_id>"); future sprints may key per
  -- attempt. NULL on legacy rows.
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Partial unique index: enforces "one row per key" only for non-NULL keys, so
-- pre-existing rows (NULL key) are unaffected and cannot conflict.
CREATE UNIQUE INDEX IF NOT EXISTS uq_action_executions_idempotency_key
  ON public.action_executions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.action_executions.idempotency_key IS
  'Deterministic dedupe key (e.g. "dryrun:<action_id>"). Partial-unique (non-NULL). A repeated execute resolves the existing row instead of creating a duplicate. NULL on legacy rows.';

-- ── 2. Audit log immutability hardening ─────────────────────────────────────
-- RLS does not apply to the table owner unless FORCED. action_audit_log has
-- SELECT + INSERT policies only (no UPDATE/DELETE), so FORCE makes the
-- append-only guarantee hold for every role, owner included. Policies unchanged.
ALTER TABLE public.action_audit_log FORCE ROW LEVEL SECURITY;

COMMIT;
