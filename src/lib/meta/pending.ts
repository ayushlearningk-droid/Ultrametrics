import { createAdminClient } from "@/lib/supabase/admin";

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

  return data;
}