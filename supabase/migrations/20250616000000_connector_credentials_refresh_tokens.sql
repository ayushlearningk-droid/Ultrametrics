-- =============================================================================
-- C2 Token Vault Step 2 (PR 1) — add refresh-token columns to connector_credentials
-- =============================================================================
-- The connector_credentials table (20250602000000_meta_ads_connectors.sql) stores
-- only the access-token AES-256-GCM envelope. Google / Google Ads connectors also
-- have a long-lived refresh token that must be encrypted at rest, so we add three
-- nullable columns for its envelope.
--
-- Purely additive. Nullable because Meta connectors have no refresh token, so the
-- columns stay NULL for them. Does NOT read, modify, move, or delete any existing
-- row or column. Idempotent: each column is guarded with IF NOT EXISTS, so
-- re-application is a no-op.
-- =============================================================================

BEGIN;

ALTER TABLE public.connector_credentials
  ADD COLUMN IF NOT EXISTS refresh_token_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_iv         TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_tag        TEXT;

COMMENT ON COLUMN public.connector_credentials.refresh_token_ciphertext IS
  'Base64 AES-256-GCM ciphertext of the OAuth refresh token (Google / Google Ads). NULL for Meta.';

COMMIT;
