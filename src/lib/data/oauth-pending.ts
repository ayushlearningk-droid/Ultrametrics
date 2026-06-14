import { createAdminClient } from "@/lib/supabase/admin";
import { META_OAUTH_PENDING_TTL_SECONDS } from "@/lib/meta/constants";
import type { OAuthPendingSession } from "@/types/database";

export type CreateOAuthPendingInput = {
  userId: string;
  workspaceId: string;
  state: string;
  accessToken: string;
  provider?: string;
};

export async function createOAuthPendingSession(
  input: CreateOAuthPendingInput
): Promise<OAuthPendingSession> {
  const admin = createAdminClient();
  const expiresAt = new Date(
    Date.now() + META_OAUTH_PENDING_TTL_SECONDS * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("oauth_pending_sessions")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      provider: input.provider ?? "meta_ads",
      state: input.state,
      access_token: input.accessToken,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to store OAuth session");
  }

  return data as OAuthPendingSession;
}

export async function deleteOAuthPendingForUserWorkspace(
  userId: string,
  workspaceId: string,
  provider = "meta_ads"
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("oauth_pending_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);
}
