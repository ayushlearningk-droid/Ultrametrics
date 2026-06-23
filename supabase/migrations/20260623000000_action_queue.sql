-- =============================================================================
-- Sprint 10 — Action Queue persistence
-- =============================================================================
-- Per-user-private, workspace-scoped record of decisions made in the Action
-- Queue: an approved AI recommendation (from Ask Ultrametrics) is persisted here
-- so it survives refresh and is shared across the user's surfaces.
--
-- Scope A (matches ai_conversations exactly): a row belongs to ONE user
-- (user_id) within ONE workspace (workspace_id). RLS makes rows private to the
-- creating user AND gated on workspace membership — other members never see
-- each other's queue.
--
-- Persisted ≠ executed: this table records approvals only. No Meta/Google API,
-- no execution.
--
-- Additive + idempotent (IF NOT EXISTS guards). Reuses the existing
-- uuid_generate_v4(), set_updated_at() trigger fn, and is_workspace_member()
-- helper. RLS is enabled with an owner-scoped policy (deny-by-default to anyone
-- else). Writes go through the user's session (anon) client — no service role.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.action_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  -- Origin of the action, e.g. "Ask Ultrametrics", "Meta Ads".
  source          TEXT,
  -- Coarse action kind, e.g. "scale" | "pause" | "budget" | "fix".
  type            TEXT,
  rationale       TEXT,
  expected_impact TEXT,
  priority        TEXT CHECK (priority IN ('High', 'Medium', 'Low')),
  status          TEXT NOT NULL DEFAULT 'approved'
                    CHECK (status IN ('pending', 'approved', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_queue_ws_user
  ON public.action_queue (workspace_id, user_id, created_at DESC);

DROP TRIGGER IF EXISTS action_queue_updated_at ON public.action_queue;
CREATE TRIGGER action_queue_updated_at
  BEFORE UPDATE ON public.action_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: per-user-private within member workspaces (Scope A) ─────────────────
ALTER TABLE public.action_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own actions in member workspaces" ON public.action_queue;
CREATE POLICY "Own actions in member workspaces"
  ON public.action_queue FOR ALL
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

COMMENT ON TABLE public.action_queue IS
  'Action Queue decisions (approved AI recommendations). Per-user-private, workspace-scoped (RLS: user_id = auth.uid() AND workspace member). Records approvals only — no execution.';

COMMIT;
