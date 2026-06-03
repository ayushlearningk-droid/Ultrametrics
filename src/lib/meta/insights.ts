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
    `&date_preset=last_30d` +
    `&access_token=${accessToken}`;

  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  const json = await res.json();

  console.log(
    "META RAW INSIGHTS:",
    JSON.stringify(json, null, 2)
  );

  return json.data ?? [];
}