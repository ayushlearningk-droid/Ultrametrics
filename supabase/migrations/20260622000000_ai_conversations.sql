-- =============================================================================
-- U1 Phase 1 — Persistent Ask Ultrametrics conversations
-- =============================================================================
-- Per-user-private, workspace-scoped chat threads + their messages, so Ask
-- Ultrametrics conversations survive refresh and power a history sidebar.
--
-- Scoping: a conversation belongs to ONE user (user_id) within ONE workspace
-- (workspace_id). RLS makes them private to the creating user AND gated on
-- workspace membership — other workspace members never see each other's chats.
--
-- Additive + idempotent (IF NOT EXISTS guards). Reuses the existing
-- uuid_generate_v4(), set_updated_at() trigger fn, and is_workspace_member()
-- helper. RLS is enabled with owner-scoped policies (deny-by-default to anyone
-- else). Writes go through the user's session (anon) client — no service role.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id         UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL DEFAULT 'New chat',
  -- Whether `title` was auto-generated (vs. user-renamed); lets a later phase
  -- replace a placeholder title without clobbering a manual rename.
  title_generated      BOOLEAN NOT NULL DEFAULT FALSE,
  -- Short preview of the latest message, for the sidebar (no message join).
  last_message_preview TEXT,
  archived_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_ws_user
  ON public.ai_conversations (workspace_id, user_id, updated_at DESC);

DROP TRIGGER IF EXISTS ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  -- Assistant turns: { model, escalated, inputTokens, outputTokens, stopReason }.
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON public.ai_messages (conversation_id, created_at);

-- ── RLS: per-user-private within member workspaces ──────────────────────────
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own conversations in member workspaces" ON public.ai_conversations;
CREATE POLICY "Own conversations in member workspaces"
  ON public.ai_conversations FOR ALL
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Messages of own conversations" ON public.ai_messages;
CREATE POLICY "Messages of own conversations"
  ON public.ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
        AND public.is_workspace_member(c.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
        AND public.is_workspace_member(c.workspace_id)
    )
  );

COMMENT ON TABLE public.ai_conversations IS
  'Ask Ultrametrics chat threads. Per-user-private, workspace-scoped (RLS: user_id = auth.uid() AND workspace member).';
COMMENT ON TABLE public.ai_messages IS
  'Ask Ultrametrics messages. Access gated through the parent conversation owner (RLS).';

COMMIT;
