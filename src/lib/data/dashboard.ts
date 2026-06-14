import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type {
  Connector,
  Subscription,
  SyncJob,
  User,
  WorkspaceSyncSchedule,
} from "@/types/database";

export async function getWorkspaceSyncSchedule(
  workspaceId: string
): Promise<WorkspaceSyncSchedule | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("workspace_sync_schedules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as WorkspaceSyncSchedule | null) ?? null;
}

export async function getConnectorsByWorkspace(
  workspaceId: string
): Promise<Connector[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("connectors")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (data ?? []) as Connector[];
}

export async function getSyncJobsByWorkspace(
  workspaceId: string,
  limit = 50
): Promise<SyncJob[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as SyncJob[];
}

export async function getSubscriptionByWorkspace(
  workspaceId: string
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  return data as Subscription | null;
}

export async function getUserProfile(
  userId: string
): Promise<User | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return data as User | null;
}

export async function getConnectorCount(
  workspaceId: string
): Promise<number> {
  const admin = createAdminClient();

  const { count, error } = await admin
    .from("connectors")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[dashboard] getConnectorCount error:", error);
    return 0;
  }

  return count ?? 0;
}