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
    `&date_preset=maximum` +
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

export interface DailyInsightRow {
  date_start: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
}

/** Fetch day-by-day breakdown for the last `days` days (default 14). */
export async function getAccountInsightsByDay(
  accessToken: string,
  accountId: string,
  days = 14
): Promise<DailyInsightRow[]> {
  const fields = ["impressions", "clicks", "spend", "ctr"].join(",");
  const params = new URLSearchParams({
    fields,
    date_preset: "maximum",
    time_increment: "1",
    access_token: accessToken,
  });

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights?${params}`;

  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  const json = await res.json();
  return (json.data ?? []) as DailyInsightRow[];
}