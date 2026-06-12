"use client";

import { useEffect, useState } from "react";
import {
  ConnectorMetricsStrip,
  type MetricItem,
} from "@/components/connectors/connector-metrics-strip";

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  costCurrency: number;
  conversions: number;
  conversionsValue: number;
}

function fmt(
  val: number,
  type: "currency" | "integer" | "compact" | "decimal",
  currency = "USD"
): string {
  switch (type) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    case "integer":
      return new Intl.NumberFormat("en-US").format(Math.round(val));
    case "compact":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(val);
    case "decimal":
      return val.toFixed(2);
  }
}

export function GoogleMetricsStrip() {
  const [metrics, setMetrics] = useState<MetricItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/google-ads/test-insights")
      .then((r) => r.json())
      .catch(() => null)
      .then((data) => {
        if (!data?.ok || !data.insights?.length) {
          setMetrics(null);
          setLoading(false);
          return;
        }

        const rows = data.insights as CampaignRow[];
        const cur = data.currency || "USD";

        const totalCost = rows.reduce((s, r) => s + r.costCurrency, 0);
        const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
        const totalConv = rows.reduce((s, r) => s + r.conversions, 0);
        const totalConvValue = rows.reduce((s, r) => s + r.conversionsValue, 0);

        const roas =
          totalCost > 0 ? totalConvValue / totalCost : null;

        setMetrics([
          {
            label: "Total Cost · 30d",
            value: fmt(totalCost, "currency", cur),
          },
          {
            label: "Clicks · 30d",
            value: fmt(totalClicks, "compact"),
          },
          {
            label: "Conversions",
            value: fmt(totalConv, "decimal"),
          },
          {
            label: roas !== null ? "ROAS" : "Conv. Value",
            value:
              roas !== null
                ? `${roas.toFixed(2)}×`
                : fmt(totalConvValue, "currency", cur),
          },
        ]);
        setLoading(false);
      });
  }, []);

  if (!loading && !metrics) {
    return (
      <div className="grid grid-cols-2 gap-6 px-6 py-6 lg:grid-cols-4">
        {["Total Cost", "Clicks", "Conversions", "ROAS"].map((label) => (
          <div key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20">
              {label}
            </p>
            <p className="mt-2 font-mono text-[32px] font-semibold tabular-nums leading-none text-white/15">
              —
            </p>
            <p className="mt-2 text-[11px] text-white/18">No data yet</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ConnectorMetricsStrip metrics={metrics ?? []} loading={loading} />
  );
}
