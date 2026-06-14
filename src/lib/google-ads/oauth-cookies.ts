import { cookies } from "next/headers";
import {
  GOOGLE_ADS_OAUTH_COOKIE_MAX_AGE,
  GOOGLE_ADS_OAUTH_COOKIE_STATE,
  GOOGLE_ADS_OAUTH_COOKIE_WORKSPACE,
} from "@/lib/google-ads/constants";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: GOOGLE_ADS_OAUTH_COOKIE_MAX_AGE,
};

export async function setGoogleAdsOAuthCookies(
  state: string,
  workspaceId: string
): Promise<void> {
  const store = await cookies();
  store.set(GOOGLE_ADS_OAUTH_COOKIE_STATE, state, cookieOptions);
  store.set(GOOGLE_ADS_OAUTH_COOKIE_WORKSPACE, workspaceId, cookieOptions);
}

export async function readGoogleAdsOAuthCookies(): Promise<{
  state: string | undefined;
  workspaceId: string | undefined;
}> {
  const store = await cookies();
  return {
    state: store.get(GOOGLE_ADS_OAUTH_COOKIE_STATE)?.value,
    workspaceId: store.get(GOOGLE_ADS_OAUTH_COOKIE_WORKSPACE)?.value,
  };
}

export async function clearGoogleAdsOAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(GOOGLE_ADS_OAUTH_COOKIE_STATE);
  store.delete(GOOGLE_ADS_OAUTH_COOKIE_WORKSPACE);
}
