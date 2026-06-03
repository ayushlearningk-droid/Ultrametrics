import { createAdminClient } from "@/lib/supabase/admin";
import type { Connector, Subscription, SyncJob, User } from "@/types/database";

export async function getConnectorsByWorkspace(
  workspaceId: string
): Promise<Connector[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("connectors")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  console.log("ADMIN CONNECTORS:", data);
  console.log("ADMIN ERROR:", error);

  return (data ?? []) as Connector[];
}