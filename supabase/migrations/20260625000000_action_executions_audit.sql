-- =============================================================================
-- Sprint 14A — Action Engine foundation: executions + immutable audit log
-- =============================================================================
-- Adds the execution infrastructure that sits AFTER an approved action_queue
-- row. This sprint is DRY-RUN ONLY: no provider is called, no campaign is
-- mutated. These tables record execution attempts and an append-only audit
-- trail so the (future) executor has somewhere to write state transitions.
--
--   action_queue (intent + approval)  ──►  action_executions (attempts)
--                                          action_audit_log  (immutable trail)
--
-- Purely additive: no existing table is modified, dropped, or repopulated.
-- Idempotent (IF NOT EXISTS / DROP-then-CREATE guards). Reuses the existing
-- uuid_generate_v4(), set_updated_at() trigger fn, and is_workspace_member()
-- helper. RLS is enabled on both tables.
--
-- Scope A (matches action_queue / ai_conversations exactly): a row belongs to
-- ONE actor (user_id) within ONE workspace (workspace_id); RLS makes rows
-- private to the actor AND gated on workspace membership.
--
-- action_audit_log is APPEND-ONLY: it has SELECT and INSERT policies but
-- deliberately NO UPDATE and NO DELETE policy, so RLS denies mutation/removal
-- by default — the trail is immutable for every non-service caller.
-- =============================================================================

BEGIN;

-- ── action_executions — one row per execution ATTEMPT of an approved action ──
CREATE TABLE IF NOT EXISTS public.action_executions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id           UUID NOT NULL REFERENCES public.action_queue(id) ON DELETE CASCADE,
  workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Actor on whose behalf the attempt runs (the approver). RLS anchor.
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_type          TEXT NOT NULL DEFAULT 'user'
                        CHECK (actor_type IN ('user', 'system', 'ai')),
  -- Source connector family the action targets, e.g. "meta_ads". NULL when the
  -- approved action carried no structured provider.
  provider            TEXT,
  -- 1-based attempt counter (retries increment this; one row per attempt).
  attempt_no          INTEGER NOT NULL DEFAULT 1 CHECK (attempt_no >= 1),
  -- Deterministic execution state machine (Sprint 14A). No provider call is made
  -- in this sprint, so live rows never advance past 'validating'.
  state               TEXT NOT NULL DEFAULT 'queued'
                        CHECK (state IN (
                          'not_requested', 'queued', 'validating', 'running',
                          'succeeded', 'failed', 'cancelled', 'rolled_back'
                        )),
  -- Always TRUE in Sprint 14A — provider execution is not enabled.
  dry_run             BOOLEAN NOT NULL DEFAULT TRUE,
  -- Snapshot of the structured request the executor would send (provider/entity/
  -- action_type/params), captured at execute time from the action_queue row.
  request_payload     JSONB,
  -- Pre-mutation snapshot for a future rollback (e.g. current budget/status).
  -- Never populated in Sprint 14A (no provider read).
  prior_state         JSONB,
  -- Provider response (success result). Never populated in Sprint 14A.
  result              JSONB,
  -- Provider-native idempotency echo, so a retried attempt is not double-applied.
  provider_request_id TEXT,
  error_code          TEXT,
  error_message       TEXT,
  retryable           BOOLEAN NOT NULL DEFAULT FALSE,
  next_retry_at       TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_executions_action
  ON public.action_executions (action_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_executions_ws_user
  ON public.action_executions (workspace_id, user_id, created_at DESC);

DROP TRIGGER IF EXISTS action_executions_updated_at ON public.action_executions;
CREATE TRIGGER action_executions_updated_at
  BEFORE UPDATE ON public.action_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.action_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own executions in member workspaces" ON public.action_executions;
CREATE POLICY "Own executions in member workspaces"
  ON public.action_executions FOR ALL
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

COMMENT ON TABLE public.action_executions IS
  'Action execution attempts (Sprint 14A). One row per attempt; deterministic state machine. DRY-RUN ONLY — no provider is called and live rows do not advance past validating. Per-user-private, workspace-scoped (RLS).';

-- ── action_audit_log — APPEND-ONLY immutable trail of every transition ───────
CREATE TABLE IF NOT EXISTS public.action_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id     UUID NOT NULL REFERENCES public.action_queue(id) ON DELETE CASCADE,
  -- The attempt this event belongs to (NULL for action-level events).
  execution_id  UUID REFERENCES public.action_executions(id) ON DELETE SET NULL,
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_type    TEXT NOT NULL DEFAULT 'user'
                  CHECK (actor_type IN ('user', 'system', 'ai')),
  event         TEXT NOT NULL CHECK (event IN (
                  'execute_requested', 'queued', 'validating',
                  'execution_started', 'execution_succeeded', 'execution_failed',
                  'retry_scheduled', 'cancelled', 'rolled_back', 'dry_run_halted'
                )),
  from_state    TEXT,
  to_state      TEXT,
  detail        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_audit_log_action
  ON public.action_audit_log (action_id, created_at);
CREATE INDEX IF NOT EXISTS idx_action_audit_log_ws
  ON public.action_audit_log (workspace_id, created_at DESC);

ALTER TABLE public.action_audit_log ENABLE ROW LEVEL SECURITY;

-- Append-only: SELECT + INSERT policies ONLY. With RLS enabled and no UPDATE or
-- DELETE policy present, those operations are denied by default → immutable.
DROP POLICY IF EXISTS "Read own audit in member workspaces" ON public.action_audit_log;
CREATE POLICY "Read own audit in member workspaces"
  ON public.action_audit_log FOR SELECT
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Append own audit in member workspaces" ON public.action_audit_log;
CREATE POLICY "Append own audit in member workspaces"
  ON public.action_audit_log FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

COMMENT ON TABLE public.action_audit_log IS
  'Append-only immutable audit trail for the Action Engine (Sprint 14A). One row per state transition. RLS exposes SELECT + INSERT only (no UPDATE/DELETE policy → denied by default), so the trail cannot be altered or removed by any non-service caller.';

COMMIT;
