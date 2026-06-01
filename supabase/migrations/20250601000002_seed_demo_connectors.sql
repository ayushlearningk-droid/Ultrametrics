-- Optional seed: demo connectors and sync jobs for development
-- Only run manually after creating a test user and workspace

-- Example (replace UUIDs with your workspace/connector IDs):
--
-- INSERT INTO public.connectors (workspace_id, name, provider, status, last_synced_at)
-- VALUES
--   ('YOUR_WORKSPACE_ID', 'Google Ads - Brand', 'google_ads', 'active', NOW() - INTERVAL '2 hours'),
--   ('YOUR_WORKSPACE_ID', 'Meta Ads - Performance', 'meta_ads', 'active', NOW() - INTERVAL '1 hour');
