import { cookies } from "next/headers";

const GOOGLE_OAUTH_COOKIE_STATE = "google_oauth_state";
const GOOGLE_OAUTH_COOKIE_WORKSPACE = "google_oauth_workspace";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

export async function setGoogleOAuthCookies(
  state: string,
  workspaceId: string
): Promise<void> {
  const store = await cookies();
  store.set(GOOGLE_OAUTH_COOKIE_STATE, state, cookieOptions);
  store.set(GOOGLE_OAUTH_COOKIE_WORKSPACE, workspaceId, cookieOptions);
}

export async function readGoogleOAuthCookies(): Promise<{
  state: string | undefined;
  workspaceId: string | undefined;
}> {
  const store = await cookies();

  return {
    state: store.get(GOOGLE_OAUTH_COOKIE_STATE)?.value,
    workspaceId: store.get(GOOGLE_OAUTH_COOKIE_WORKSPACE)?.value,
  };
}

export async function clearGoogleOAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(GOOGLE_OAUTH_COOKIE_STATE);
  store.delete(GOOGLE_OAUTH_COOKIE_WORKSPACE);
}
