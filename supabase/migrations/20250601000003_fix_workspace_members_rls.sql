-- Fix recursive RLS on workspace_members (is_workspace_member bootstrap)

DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own workspace memberships"
  ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can view workspace members in shared workspaces"
  ON public.workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view workspaces"
  ON public.workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = subscriptions.workspace_id
        AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = subscriptions.workspace_id
        AND w.owner_id = auth.uid()
    )
  );
