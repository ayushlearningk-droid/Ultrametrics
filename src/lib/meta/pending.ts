import { createAdminClient } from "@/lib/supabase/admin";
import { decodePendingAccessToken } from "@/lib/data/oauth-pending";

export async function getLatestMetaPendingSession(
  workspaceId: string
) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("oauth_pending_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "meta_ads")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  // Decrypt the stored token transparently (Sprint 55C).
  return { ...data, access_token: decodePendingAccessToken(data.access_token) };
}