-- =============================================================================
-- Sprint 16 — Workspace Settings & Feature Management
-- =============================================================================
-- One row per workspace holding shared, workspace-scoped configuration: feature
-- flags, locale preferences, notification preferences, and environment. These
-- are PREFERENCES — they do not change connector or Action Engine behaviour.
--
-- In particular `action_engine_enabled` is a stored workspace preference; the
-- REAL execution kill-switch remains the server-side ENABLE_ACTION_EXECUTION env
-- var (Sprint 14B). This table never overrides that — no Action Engine logic is
-- touched by this migration.
--
-- Additive + idempotent (IF NOT EXISTS). Reuses uuid_generate_v4(),
-- set_updated_at(), and is_workspace_member(). RLS: shared within the workspace
-- (any member may read/write), mirroring workspace-scoped config.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- ── Feature flags (workspace preferences) ──────────────────────────────────
  ai_insights_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  action_engine_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_actions_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  autonomous_ai_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  beta_features_enabled      BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Locale / workspace preferences ─────────────────────────────────────────
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  currency        TEXT NOT NULL DEFAULT 'USD',
  date_format     TEXT NOT NULL DEFAULT 'YYYY-MM-DD'
                    CHECK (date_format IN (
                      'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'D MMM YYYY'
                    )),

  -- ── Notification preferences ───────────────────────────────────────────────
  notify_email             BOOLEAN NOT NULL DEFAULT TRUE,
  notify_in_app            BOOLEAN NOT NULL DEFAULT TRUE,
  notify_failed_sync       BOOLEAN NOT NULL DEFAULT TRUE,
  notify_ai_opportunities  BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Environment ────────────────────────────────────────────────────────────
  environment     TEXT NOT NULL DEFAULT 'production'
                    CHECK (environment IN ('production', 'sandbox')),

  last_saved_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace
  ON public.workspace_settings (workspace_id);

DROP TRIGGER IF EXISTS workspace_settings_updated_at ON public.workspace_settings;
CREATE TRIGGER workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: shared within the workspace (any member may read/write) ─────────────
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage workspace settings" ON public.workspace_settings;
CREATE POLICY "Members manage workspace settings"
  ON public.workspace_settings FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

COMMENT ON TABLE public.workspace_settings IS
  'Workspace-scoped settings (feature flags, locale, notifications, environment). Preferences only — does not change connector or Action Engine behaviour. action_engine_enabled does NOT override the server ENABLE_ACTION_EXECUTION kill-switch. RLS: any workspace member may read/write.';

COMMIT;
