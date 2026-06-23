-- =============================================================================
-- Sprint 5 — Pin conversations (ai_conversations.pinned_at)
-- =============================================================================
-- Adds a nullable pin timestamp so conversations can be pinned to a Favorites
-- section and sorted pinned-first. Purely additive + idempotent; RLS is
-- unchanged (the existing per-user/workspace policy already covers this column).
-- =============================================================================

BEGIN;

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Pinned-first ordering per user+workspace (NULLS LAST → unpinned sort after).
CREATE INDEX IF NOT EXISTS idx_ai_conversations_pinned
  ON public.ai_conversations (workspace_id, user_id, pinned_at DESC NULLS LAST);

COMMENT ON COLUMN public.ai_conversations.pinned_at IS
  'When set, the conversation is pinned (Favorites); sorted before unpinned. NULL = not pinned.';

COMMIT;
