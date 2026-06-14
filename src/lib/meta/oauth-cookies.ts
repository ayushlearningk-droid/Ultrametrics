import { cookies } from "next/headers";
import {
  META_OAUTH_COOKIE_MAX_AGE,
  META_OAUTH_COOKIE_STATE,
  META_OAUTH_COOKIE_WORKSPACE,
} from "@/lib/meta/constants";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: META_OAUTH_COOKIE_MAX_AGE,
};

export async function setMetaOAuthCookies(
  state: string,
  workspaceId: string
): Promise<void> {
  console.log("========== META OAUTH COOKIE SET ==========");
  console.log("STATE:", state);
  console.log("WORKSPACE ID:", workspaceId);

  const store = await cookies();

  store.set(META_OAUTH_COOKIE_STATE, state, cookieOptions);
  store.set(META_OAUTH_COOKIE_WORKSPACE, workspaceId, cookieOptions);

  console.log("COOKIE SAVED");
  console.log("===========================================");
}

export async function readMetaOAuthCookies(): Promise<{
  state: string | undefined;
  workspaceId: string | undefined;
}> {
  const store = await cookies();

  const result = {
    state: store.get(META_OAUTH_COOKIE_STATE)?.value,
    workspaceId: store.get(META_OAUTH_COOKIE_WORKSPACE)?.value,
  };

  console.log("========== META OAUTH COOKIE READ ==========");
  console.log("COOKIE STATE:", result.state);
  console.log("COOKIE WORKSPACE:", result.workspaceId);
  console.log("============================================");

  return result;
}

export async function clearMetaOAuthCookies(): Promise<void> {
  console.log("========== META OAUTH COOKIE CLEAR ==========");

  const store = await cookies();

  store.delete(META_OAUTH_COOKIE_STATE);
  store.delete(META_OAUTH_COOKIE_WORKSPACE);

  console.log("COOKIES CLEARED");
  console.log("=============================================");
}