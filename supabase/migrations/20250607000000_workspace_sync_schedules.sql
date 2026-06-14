-- Workspace-level scheduler configuration for future cron execution

CREATE TABLE IF NOT EXISTS public.workspace_sync_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at TIMESTAMPTZ,
  last_saved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_sync_schedules_workspace_id
  ON public.workspace_sync_schedules (workspace_id);

CREATE TRIGGER workspace_sync_schedules_updated_at
  BEFORE UPDATE ON public.workspace_sync_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- API routes use service-role client for reads/writes.
ALTER TABLE public.workspace_sync_schedules ENABLE ROW LEVEL SECURITY;
