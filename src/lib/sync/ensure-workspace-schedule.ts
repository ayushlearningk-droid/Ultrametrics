import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureWorkspaceSyncSchedule(
  workspaceId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("workspace_sync_schedules")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing) return;

  await admin.from("workspace_sync_schedules").insert({
    workspace_id: workspaceId,
    frequency: "daily",
    enabled: true,
    next_run_at: null,
  });
}
