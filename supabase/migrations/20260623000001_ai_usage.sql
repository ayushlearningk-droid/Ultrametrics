-- =============================================================================
-- Sprint 11 — AI Usage telemetry (analytics only)
-- =============================================================================
-- One row per completed Ask Ultrametrics turn, capturing the model, token usage,
-- tool rounds, and routing reason. Powers the AI Usage dashboard.
--
-- ANALYTICS / TELEMETRY ONLY — this table is NOT a billing or enforcement
-- surface. Cost gates (rate limits, concurrency) live in the in-memory limiter
-- (src/lib/ai/limits.ts); plan entitlements live in subscriptions. Nothing reads
-- ai_usage to allow/deny a request. Append-only: rows are inserted on the chat
-- turn's `done` event (best-effort) and never updated, so there is no
-- updated_at column / trigger.
--
-- Scope (Decision: workspace-shared read): RLS lets ANY workspace member read
-- the whole workspace's usage (so owners/admins see team-wide totals), while
-- writes stay self-attributed (user_id = auth.uid()). Access to the dashboard
-- page itself is further gated to owner/admin in the app layer.
--
-- Additive + idempotent (IF NOT EXISTS guards). Reuses uuid_generate_v4() and
-- is_workspace_member(). Writes go through the user's session (anon) client.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  model         TEXT NOT NULL,
  escalated     BOOLEAN NOT NULL DEFAULT FALSE,
  route_reason  TEXT,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  tool_rounds   INTEGER NOT NULL DEFAULT 0,
  stop_reason   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_ws_created
  ON public.ai_usage (workspace_id, created_at DESC);

-- ── RLS: workspace-shared read, self-attributed writes ──────────────────────
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace usage, self-attributed writes" ON public.ai_usage;
CREATE POLICY "Workspace usage, self-attributed writes"
  ON public.ai_usage FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

COMMENT ON TABLE public.ai_usage IS
  'AI usage telemetry (one row per completed Ask turn). ANALYTICS ONLY — not billing/enforcement. RLS: workspace-shared read (is_workspace_member); writes self-attributed (user_id = auth.uid()). Append-only.';

COMMIT;
