-- =============================================================================
-- C3-1 — Lock down subscriptions writes (Stripe webhook is the source of truth)
-- =============================================================================
-- The "Owners can update subscriptions" policy let a workspace owner directly
-- UPDATE plan_id / status / Stripe fields via the anon client, enabling
-- self-serve entitlement escalation. Subscription state must only be mutated by
-- the service-role client (Stripe webhook) and the SECURITY DEFINER provisioning
-- trigger.
--
-- This migration removes that UPDATE policy. RLS stays enabled; with no INSERT/
-- UPDATE/DELETE policy remaining, all client writes are denied by default while
-- the service role (which bypasses RLS) continues to work. The members SELECT
-- policy is intentionally left intact so the billing UI can still read the plan.
--
-- Idempotent: guarded with IF EXISTS, safe to re-run. No data is read or modified.
-- =============================================================================

BEGIN;

-- Belt-and-suspenders: RLS must be on for the deny-by-default to apply.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Remove the owner self-update capability.
DROP POLICY IF EXISTS "Owners can update subscriptions" ON public.subscriptions;

COMMENT ON TABLE public.subscriptions IS
  'Billing state. Writes are service-role only (Stripe webhook). Clients have SELECT only via the members view policy.';

COMMIT;
