import { cookies } from "next/headers";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { User, Workspace } from "@/types/database";

export function profileFromAuthUser(authUser: AuthUser): User {
  const meta = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    full_name:
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      null,
    avatar_url: (meta.avatar_url as string | undefined) ?? null,
    created_at: authUser.created_at,
    updated_at: authUser.created_at,
  };
}

export async function getUserWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  if (!memberships?.length) {
    const { data: owned } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    return (owned ?? []) as Workspace[];
  }

  const workspaceIds = (memberships as { workspace_id: string }[]).map(
    (m) => m.workspace_id
  );
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", workspaceIds)
    .order("created_at", { ascending: true });

  return (workspaces ?? []) as Workspace[];
}

export async function getCurrentWorkspaceId(
  workspaces: Workspace[]
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get("workspace_id")?.value;

  if (cookieId && workspaces.some((w) => w.id === cookieId)) {
    return cookieId;
  }

  return workspaces[0]?.id ?? null;
}

export async function getDashboardContext() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  const profile =
    (profileData as User | null) ?? profileFromAuthUser(authUser);

  const workspaces = await getUserWorkspaces();
  const currentWorkspaceId = await getCurrentWorkspaceId(workspaces);

  return {
    authUser,
    profile,
    workspaces,
    currentWorkspaceId,
  };
}
