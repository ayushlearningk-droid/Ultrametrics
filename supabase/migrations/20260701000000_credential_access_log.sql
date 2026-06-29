-- =============================================================================
-- C2 Token Vault Phase D (Sprint 55D) — immutable credential access audit log
-- =============================================================================
-- Append-only audit trail for every credential operation (store / read / delete /
-- authorize). It records METADATA ONLY — never a plaintext token, ciphertext, IV,
-- or auth tag. Written by the server via the service role; RLS denies all client
-- access, and a trigger blocks UPDATE/DELETE so rows are immutable once written.
--
-- No FK to connectors: the audit record must survive connector deletion. Purely
-- additive; does not read, modify, or remove any existing table/row.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.connector_credential_access_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id  UUID NOT NULL,
  workspace_id  UUID,
  action        TEXT NOT NULL CHECK (action IN ('store', 'read', 'delete', 'authorize')),
  success       BOOLEAN NOT NULL,
  reason        TEXT,
  key_version   SMALLINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.connector_credential_access_log IS
  'Immutable, append-only audit trail of credential access. Metadata only — never stores tokens or secrets.';

CREATE INDEX IF NOT EXISTS idx_cred_access_log_connector
  ON public.connector_credential_access_log (connector_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cred_access_log_workspace
  ON public.connector_credential_access_log (workspace_id, created_at DESC);

-- RLS: no client policies — only the service role (server) may write.
ALTER TABLE public.connector_credential_access_log ENABLE ROW LEVEL SECURITY;

-- Immutability: block UPDATE and DELETE for everyone (including the service role).
CREATE OR REPLACE FUNCTION public.prevent_credential_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'connector_credential_access_log is append-only and cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS no_mutate_credential_access_log
  ON public.connector_credential_access_log;
CREATE TRIGGER no_mutate_credential_access_log
  BEFORE UPDATE OR DELETE ON public.connector_credential_access_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_credential_log_mutation();

COMMIT;
