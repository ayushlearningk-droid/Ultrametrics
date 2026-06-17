-- =============================================================================
-- C3 PR3 — Harden sync_jobs writes (service-role only)
-- =============================================================================
-- The "Members can insert/update sync jobs" policies let any workspace member
-- write sync_jobs rows via the anon client (spoof status / records_processed /
-- error_message, pollute job history). The application never writes sync_jobs
-- through the client — all inserts/updates use the service-role client
-- (createAdminClient), which bypasses RLS. These client write policies are
-- therefore dead from the app's perspective.
--
-- This migration removes them so client writes are denied by default while the
-- service-role sync continues to work. The members SELECT policy is retained so
-- the dashboard / direct reads can still view job history.
--
-- Policy-only change: no data is read or modified. No application code changes.
-- Idempotent: guarded with IF EXISTS, safe to re-run.
-- =============================================================================

BEGIN;

-- Remove client write access; service role (RLS-bypass) is unaffected.
DROP POLICY IF EXISTS "Members can insert sync jobs" ON public.sync_jobs;
DROP POLICY IF EXISTS "Members can update sync jobs" ON public.sync_jobs;

-- "Members can view sync jobs" (SELECT) is intentionally left in place.

COMMENT ON TABLE public.sync_jobs IS
  'Sync run history. SELECT for all workspace members; INSERT/UPDATE/DELETE are service-role only (sync runs via createAdminClient).';

COMMIT;
