/**
 * Realistic demo data used by the dev screenshot bypass.
 * Only returned when __dev_screenshot=1 cookie is present.
 */

export const DEMO_META_DAILY = {
  success: true,
  currency: "USD",
  days: [
    { date_start: "2026-05-26", spend: "312.40", ctr: "1.42", impressions: "28400", clicks: "403" },
    { date_start: "2026-05-27", spend: "298.75", ctr: "1.38", impressions: "27100", clicks: "374" },
    { date_start: "2026-05-28", spend: "185.20", ctr: "1.51", impressions: "19800", clicks: "299" },
    { date_start: "2026-05-29", spend: "176.90", ctr: "1.48", impressions: "18600", clicks: "275" },
    { date_start: "2026-05-30", spend: "341.60", ctr: "1.55", impressions: "30200", clicks: "468" },
    { date_start: "2026-05-31", spend: "389.20", ctr: "1.61", impressions: "33500", clicks: "539" },
    { date_start: "2026-06-01", spend: "402.85", ctr: "1.64", impressions: "34900", clicks: "572" },
    { date_start: "2026-06-02", spend: "378.50", ctr: "1.59", impressions: "32100", clicks: "510" },
    { date_start: "2026-06-03", spend: "421.30", ctr: "1.71", impressions: "35800", clicks: "612" },
    { date_start: "2026-06-04", spend: "448.90", ctr: "1.78", impressions: "37200", clicks: "662" },
    { date_start: "2026-06-05", spend: "456.20", ctr: "1.82", impressions: "38100", clicks: "694" },
    { date_start: "2026-06-06", spend: "471.40", ctr: "1.85", impressions: "39400", clicks: "729" },
    { date_start: "2026-06-07", spend: "463.80", ctr: "1.83", impressions: "38700", clicks: "708" },
    { date_start: "2026-06-08", spend: "488.50", ctr: "1.89", impressions: "40200", clicks: "760" },
  ],
};

export const DEMO_META_TOTALS = {
  success: true,
  currency: "USD",
  insights: [
    {
      account_id: "act_123456789",
      spend: "4835.50",
      impressions: "454000",
      clicks: "7405",
      ctr: "1.63",
      cpc: "0.65",
      reach: "198400",
      date_start: "2026-05-09",
      date_stop: "2026-06-08",
    },
  ],
};

export const DEMO_GOOGLE_INSIGHTS = {
  ok: true,
  currency: "USD",
  insights: [
    {
      campaignId: "c1",
      campaignName: "Brand — Exact Match",
      date: "2026-06-01",
      impressions: 18400,
      clicks: 1240,
      costCurrency: 892.40,
      conversions: 87,
      conversionsValue: 4350.0,
    },
    {
      campaignId: "c2",
      campaignName: "Retargeting — All Visitors",
      date: "2026-06-01",
      impressions: 24100,
      clicks: 980,
      costCurrency: 623.80,
      conversions: 42,
      conversionsValue: 2100.0,
    },
    {
      campaignId: "c3",
      campaignName: "Prospecting — Interest",
      date: "2026-06-01",
      impressions: 61200,
      clicks: 1820,
      costCurrency: 1248.60,
      conversions: 31,
      conversionsValue: 1550.0,
    },
    {
      campaignId: "c4",
      campaignName: "Shopping — All Products",
      date: "2026-06-01",
      impressions: 39800,
      clicks: 2140,
      costCurrency: 987.20,
      conversions: 64,
      conversionsValue: 3840.0,
    },
  ],
};

export const DEMO_CONNECTORS = [
  {
    id: "demo-meta",
    provider: "meta_ads",
    name: "Meta Ads",
    status: "active" as const,
    last_synced_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    external_account_id: "987654321",
    external_account_name: "Acme Corp Ads",
    config: {},
  },
  {
    id: "demo-google",
    provider: "google_ads",
    name: "Google Ads",
    status: "active" as const,
    last_synced_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    external_account_id: "5646010284",
    external_account_name: "Acme Corp (Google)",
    config: {},
  },
];

export const DEMO_SYNC_JOBS = [
  {
    id: "job-1",
    connector_id: "demo-meta",
    status: "completed" as const,
    records_processed: 2847,
    created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    error_message: null,
  },
  {
    id: "job-2",
    connector_id: "demo-google",
    status: "completed" as const,
    records_processed: 1432,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    error_message: null,
  },
  {
    id: "job-3",
    connector_id: "demo-meta",
    status: "completed" as const,
    records_processed: 2891,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000 - 12 * 60 * 1000).toISOString(),
    error_message: null,
  },
  {
    id: "job-4",
    connector_id: "demo-google",
    status: "completed" as const,
    records_processed: 1388,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000 - 25 * 60 * 1000).toISOString(),
    error_message: null,
  },
  {
    id: "job-5",
    connector_id: "demo-meta",
    status: "failed" as const,
    records_processed: 0,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    error_message: "Token expired",
  },
];
