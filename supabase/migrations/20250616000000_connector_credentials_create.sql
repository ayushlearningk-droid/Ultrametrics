-- =============================================================================
-- C2 Gate A — Create connector_credentials (consolidated, recovery migration)
-- =============================================================================
-- Context: the connector_credentials table was defined in
-- 20250602000000_meta_ads_connectors.sql but never successfully applied to the
-- live database (verified: information_schema returns no row for it, while
-- oauth_pending_sessions from the same file DOES exist). The Step-1 ALTER
-- migration (20250615000000) assumed the table existed and is therefore invalid
-- against production. This migration supersedes both: it creates the table
-- complete (access + refresh token columns) in a single transaction.
--
-- Purely additive. Does NOT touch connectors, connectors.config,
-- oauth_pending_sessions, or any existing row. No production data is read,
-- modified, moved, or deleted. Existing connectors continue to work from
-- connectors.config exactly as before. Token backfill is a SEPARATE later step.
--
-- Safe to run against an environment that already has the table: every object
-- is guarded with IF NOT EXISTS, so re-application is a no-op.
-- =============================================================================

BEGIN;

-- ── Table ────────────────────────────────────────────────────────────────────
-- One row per connector (connector_id is the PRIMARY KEY). Secrets are stored
-- as AES-256-GCM envelopes: ciphertext + iv + auth tag, each base64 TEXT.
-- access_token_* : required for every provider (Meta, Google, Google Ads).
-- refresh_token_*: nullable — only Google / Google Ads have a refresh token;
--                  Meta does not, so these stay NULL for Meta connectors.
-- key_version    : supports future key rotation without a schema change.
CREATE TABLE IF NOT EXISTS public.connector_credentials (
  connector_id              UUID PRIMARY KEY
                              REFERENCES public.connectors(id) ON DELETE CASCADE,
  access_token_ciphertext   TEXT        NOT NULL,
  access_token_iv           TEXT        NOT NULL,
  access_token_tag          TEXT        NOT NULL,
  refresh_token_ciphertext  TEXT,
  refresh_token_iv          TEXT,
  refresh_token_tag         TEXT,
  token_expires_at          TIMESTAMPTZ,
  key_version               SMALLINT    NOT NULL DEFAULT 1,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ───────────────────────────────────────────────────────
-- Reuses the existing public.set_updated_at() function (defined in
-- 20250601000000_initial_schema.sql and confirmed present in the live DB).
-- Guarded so re-running does not error on an existing trigger.
DROP TRIGGER IF EXISTS connector_credentials_updated_at
  ON public.connector_credentials;

CREATE TRIGGER connector_credentials_updated_at
  BEFORE UPDATE ON public.connector_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- Enable RLS with NO policies. PostgREST/client roles therefore have zero access;
-- only the service-role client (used exclusively by the data layer) can touch the
-- table. This matches oauth_pending_sessions and the original design intent.
ALTER TABLE public.connector_credentials ENABLE ROW LEVEL SECURITY;

-- ── Column documentation ───────────────────────────────────────────────────────
COMMENT ON TABLE public.connector_credentials IS
  'Encrypted OAuth tokens (AES-256-GCM). Service-role access only. One row per connector.';
COMMENT ON COLUMN public.connector_credentials.access_token_ciphertext IS
  'Base64 AES-256-GCM ciphertext of the OAuth access token.';
COMMENT ON COLUMN public.connector_credentials.refresh_token_ciphertext IS
  'Base64 AES-256-GCM ciphertext of the OAuth refresh token (Google / Google Ads). NULL for Meta.';
COMMENT ON COLUMN public.connector_credentials.key_version IS
  'Encryption key version, for future key rotation. Defaults to 1.';

COMMIT;
