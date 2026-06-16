-- =============================================================================
-- C3-2 — Restrict connector writes to owners/admins (members read-only)
-- =============================================================================
-- The "Members can manage connectors" policy granted FOR ALL to every workspace
-- member (any role), so a low-privilege 'member' could INSERT/UPDATE/DELETE
-- connectors and write arbitrary config via the anon client. This replaces that
-- blanket policy with role-scoped write policies (owner/admin only) while keeping
-- SELECT open to all members so the dashboard can show connector status.
--
-- Roles come from public.user_role ENUM ('owner','admin','member') — there is no
-- 'viewer' role. Each write policy uses an explicit WITH CHECK so a row can never
-- be inserted/updated into a workspace where the actor is not an owner/admin.
--
-- Policy-only change: no data is read or modified. Application code is unaffected
-- because all server writes use the service-role client (which bypasses RLS).
-- Idempotent: guarded with IF EXISTS / IF NOT EXISTS patterns, safe to re-run.
-- =============================================================================

BEGIN;

-- Remove the blanket FOR ALL write policy. The members SELECT policy
-- ("Members can view connectors") is intentionally left untouched.
DROP POLICY IF EXISTS "Members can manage connectors" ON public.connectors;

-- INSERT — owner/admin only; WITH CHECK pins the new row to a workspace the
-- actor administers.
DROP POLICY IF EXISTS "Owners and admins can insert connectors" ON public.connectors;
CREATE POLICY "Owners and admins can insert connectors"
  ON public.connectors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = connectors.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- UPDATE — owner/admin only; USING gates which rows are updatable, WITH CHECK
-- prevents moving a row into a workspace the actor does not administer.
DROP POLICY IF EXISTS "Owners and admins can update connectors" ON public.connectors;
CREATE POLICY "Owners and admins can update connectors"
  ON public.connectors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = connectors.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = connectors.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- DELETE — owner/admin only.
DROP POLICY IF EXISTS "Owners and admins can delete connectors" ON public.connectors;
CREATE POLICY "Owners and admins can delete connectors"
  ON public.connectors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = connectors.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE public.connectors IS
  'Connector config + metadata. SELECT for all workspace members; INSERT/UPDATE/DELETE restricted to owner/admin (client). Server writes use the service role.';

COMMIT;
