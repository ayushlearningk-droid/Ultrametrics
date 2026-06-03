import { META_GRAPH_VERSION } from "@/lib/meta/constants";

export type MetaAdAccount = {
  id: string;
  name: string;
  account_status?: number;
};

export async function fetchMetaAdAccounts(
  accessToken: string
): Promise<MetaAdAccount[]> {
  const url =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/me/adaccounts` +
    `?fields=id,name,account_status&access_token=${accessToken}`;

  const res = await fetch(url);
  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      body?.error?.message ??
        "Failed to fetch Meta ad accounts"
    );
  }

  return body.data ?? [];
}