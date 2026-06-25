-- =============================================================================
-- Sprint 31 — AI Workspace Memory
-- =============================================================================
-- Durable, workspace-scoped notes/preferences the AI should remember across
-- sessions (e.g. "target ROAS is 3.0", "never pause brand campaigns"). These are
-- USER-PROVIDED context, not metrics — the AI injects them for grounding/voice
-- but still sources every number from tools. Created either explicitly in
-- Settings (source 'user') or via the AI "remember" tool (source 'ai').
--
-- Additive + idempotent. Reuses uuid_generate_v4(), set_updated_at(),
-- is_workspace_member(). RLS: shared within the workspace (any member may
-- read/write), mirroring workspace_settings.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_memory (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  -- Who created the note: a human in Settings, or the AI "remember" tool.
  source        TEXT NOT NULL DEFAULT 'user'
                  CHECK (source IN ('user', 'ai')),
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_memory_ws
  ON public.workspace_memory (workspace_id, created_at DESC);

DROP TRIGGER IF EXISTS workspace_memory_updated_at ON public.workspace_memory;
CREATE TRIGGER workspace_memory_updated_at
  BEFORE UPDATE ON public.workspace_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workspace_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage workspace memory" ON public.workspace_memory;
CREATE POLICY "Members manage workspace memory"
  ON public.workspace_memory FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

COMMENT ON TABLE public.workspace_memory IS
  'Durable workspace notes/preferences for AI grounding (Sprint 31). User-provided context, not metrics. RLS: any workspace member may read/write.';

COMMIT;
