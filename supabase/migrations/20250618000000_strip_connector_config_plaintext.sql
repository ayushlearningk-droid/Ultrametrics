-- =============================================================================
-- C2 Phase 2 — Strip plaintext OAuth tokens from connectors.config
-- =============================================================================
-- The token vault (public.connector_credentials) is now authoritative for every
-- connector that has tokens. Production readiness was verified before this
-- migration: connector_credentials exists, credentials_rows = connectors_with_
-- tokens (4), and missing_from_vault = 0 — i.e. every plaintext-bearing
-- connector already has an encrypted vault row.
--
-- This migration removes the plaintext token keys (access_token, refresh_token,
-- token_expires_at) from connectors.config while PRESERVING every other config
-- key (currency, spreadsheet_id, spreadsheet_name, google_email, google_name,
-- connected_by, etc). It also clears EXPIRED oauth_pending_sessions rows (live
-- rows may belong to in-flight OAuth handoffs and are left intact).
--
-- IRREVERSIBLE: once the plaintext is removed it can only be recovered from a
-- pre-migration DB snapshot. Take a snapshot and confirm TOKEN_ENCRYPTION_KEY is
-- backed up before running.
--
-- Idempotent: the jsonb key-removal is a no-op on rows already stripped, and the
-- WHERE clause limits the UPDATE to rows that still contain a token key. Safe to
-- re-run; a second run affects zero rows.
-- =============================================================================

BEGIN;

-- Remove the three token-related keys from config; keep all other keys intact.
UPDATE public.connectors
SET config = (config - 'access_token' - 'refresh_token' - 'token_expires_at')
WHERE config ? 'access_token'
   OR config ? 'refresh_token'
   OR config ? 'token_expires_at';

-- Clear only expired transient OAuth sessions (plaintext access tokens).
-- Live (unexpired) rows are preserved so in-flight connect handoffs still work.
DELETE FROM public.oauth_pending_sessions
WHERE expires_at < now();

COMMIT;
