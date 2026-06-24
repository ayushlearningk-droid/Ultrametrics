-- =============================================================================
-- Sprint 13A — Action Queue structured payload
-- =============================================================================
-- Adds the structured target an approved recommendation needs to become
-- EXECUTABLE later (provider, entity, action type, params). Today the queue
-- stores only free text (title/type/rationale), which loses which entity to act
-- on and with what parameters — see Sprint 13A audit.
--
-- This migration ONLY adds columns. It does NOT populate them, change status,
-- add execution state, or call any provider API. All columns are NULLABLE so
-- existing rows (and the current text-only write path) remain valid; rows stay
-- non-executable until a later sprint fills these fields.
--
-- Additive + idempotent (IF NOT EXISTS). RLS, ownership, and the existing
-- owner-scoped policy are unchanged — the new columns inherit them.
-- =============================================================================

BEGIN;

ALTER TABLE public.action_queue
  -- Source connector family, e.g. "meta_ads" | "google_ads". NULL on legacy rows.
  ADD COLUMN IF NOT EXISTS provider     TEXT,
  -- Aggregation level the action targets.
  ADD COLUMN IF NOT EXISTS entity_level TEXT,
  -- Provider-native id of the target (e.g. Meta campaign_id). App-enforced
  -- integrity — no FK (campaigns are not persisted; metrics are live-fetched).
  ADD COLUMN IF NOT EXISTS entity_id    TEXT,
  -- Precise executable action. NULL until a structured recommendation fills it.
  ADD COLUMN IF NOT EXISTS action_type  TEXT,
  -- Typed parameters for the action, e.g. {"daily_budget_minor": 5000,
  -- "currency": "USD"}. Shape is validated in the application layer at execute
  -- time; the DB only guarantees valid JSON.
  ADD COLUMN IF NOT EXISTS params_json  JSONB;

-- Controlled vocabularies — NULL-permitting so legacy/text-only rows stay valid.
-- Idempotent: drop-then-add so re-running the migration is safe.
ALTER TABLE public.action_queue
  DROP CONSTRAINT IF EXISTS action_queue_entity_level_check;
ALTER TABLE public.action_queue
  ADD CONSTRAINT action_queue_entity_level_check
  CHECK (entity_level IS NULL OR entity_level IN ('account', 'campaign', 'ad'));

ALTER TABLE public.action_queue
  DROP CONSTRAINT IF EXISTS action_queue_action_type_check;
ALTER TABLE public.action_queue
  ADD CONSTRAINT action_queue_action_type_check
  CHECK (action_type IS NULL OR action_type IN (
    'PAUSE_CAMPAIGN', 'RESUME_CAMPAIGN', 'ADJUST_BUDGET'
  ));

COMMENT ON COLUMN public.action_queue.provider IS
  'Source connector family (e.g. meta_ads). NULL on legacy/text-only rows.';
COMMENT ON COLUMN public.action_queue.entity_level IS
  'Target aggregation level: account | campaign | ad. NULL when not structured.';
COMMENT ON COLUMN public.action_queue.entity_id IS
  'Provider-native target id (e.g. Meta campaign_id). App-enforced integrity.';
COMMENT ON COLUMN public.action_queue.action_type IS
  'Executable action: PAUSE_CAMPAIGN | RESUME_CAMPAIGN | ADJUST_BUDGET. NULL until structured.';
COMMENT ON COLUMN public.action_queue.params_json IS
  'Typed action params (JSONB), e.g. {"daily_budget_minor":5000,"currency":"USD"}. Validated in app at execute time.';

COMMENT ON TABLE public.action_queue IS
  'Action Queue decisions (approved AI recommendations). Per-user-private, workspace-scoped (RLS). Records approvals only — no execution. Sprint 13A added structured target columns (provider/entity_level/entity_id/action_type/params_json), nullable and not yet populated.';

COMMIT;
