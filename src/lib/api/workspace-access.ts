import type { SupabaseClient } from "@supabase/supabase-js";

export async function isWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) {
    return true;
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  return (
    workspace !== null &&
    (workspace as { owner_id: string }).owner_id === userId
  );
}
