-- Meta Ads connector schema (credentials + OAuth pending sessions)

-- Extend connectors for external account metadata
ALTER TABLE public.connectors
  ADD COLUMN IF NOT EXISTS external_account_id TEXT,
  ADD COLUMN IF NOT EXISTS external_account_name TEXT,
  ADD COLUMN IF NOT EXISTS connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_connectors_workspace_provider
  ON public.connectors (workspace_id, provider);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connectors_workspace_provider_account
  ON public.connectors (workspace_id, provider, external_account_id)
  WHERE external_account_id IS NOT NULL;

-- Encrypted tokens (written by server via service role only)
CREATE TABLE public.connector_credentials (
  connector_id UUID PRIMARY KEY REFERENCES public.connectors(id) ON DELETE CASCADE,
  access_token_ciphertext TEXT NOT NULL,
  access_token_iv TEXT NOT NULL,
  access_token_tag TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  key_version SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER connector_credentials_updated_at
  BEFORE UPDATE ON public.connector_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Short-lived OAuth session state (server-only access)
CREATE TABLE public.oauth_pending_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta_ads',
  state TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_state
  ON public.oauth_pending_sessions (state);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_expires_at
  ON public.oauth_pending_sessions (expires_at);

-- RLS: no client policies; API uses service role
ALTER TABLE public.connector_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_pending_sessions ENABLE ROW LEVEL SECURITY;
