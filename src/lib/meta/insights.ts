const GRAPH_VERSION = "v23.0";

export async function getAccountInsights(
  accessToken: string,
  accountId: string
) {
  const fields = [
    "impressions",
    "clicks",
    "spend",
    "reach",
    "cpc",
    "cpm",
    "ctr",
  ].join(",");

  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights` +
    `?fields=${fields}` +
    `&date_preset=yesterday` +
    `&access_token=${accessToken}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch Meta insights");
  }

  const json = await res.json();

  return json.data ?? [];
}