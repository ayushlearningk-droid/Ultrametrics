-- Row Level Security policies for Ultrametrics

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Workspaces
CREATE POLICY "Members can view workspaces"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY "Owners can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace members
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can manage members"
  ON public.workspace_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Connectors
CREATE POLICY "Members can view connectors"
  ON public.connectors FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can manage connectors"
  ON public.connectors FOR ALL
  USING (public.is_workspace_member(workspace_id));

-- Sync jobs
CREATE POLICY "Members can view sync jobs"
  ON public.sync_jobs FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert sync jobs"
  ON public.sync_jobs FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update sync jobs"
  ON public.sync_jobs FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

-- Subscriptions
CREATE POLICY "Members can view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Owners can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = subscriptions.workspace_id AND w.owner_id = auth.uid()
    )
  );
