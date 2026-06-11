"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { MetricDisplay } from "@/components/ui/metric-display";

interface MetaInsight {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
}

interface MetaInsightsResponse {
  success: boolean;
  insights?: MetaInsight[];
  currency?: string;
  error?: string;
}

interface MetricCard {
  label: string;
  value: number;
  format: "currency" | "compact" | "number" | "percentage";
  trend?: number;
  sparklineData?: number[];
}

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export function MetricGrid() {
  const [metrics, setMetrics] = useState<MetricCard[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meta/test-insights")
      .then((r) => r.json() as Promise<MetaInsightsResponse>)
      .then((data) => {
        if (!data.success || !data.insights?.length) {
          setError(data.error ?? "No Meta data");
          setLoading(false);
          return;
        }

        const rows = data.insights;
        if (data.currency) setCurrency(data.currency);

        const sum = (key: keyof MetaInsight) =>
          rows.reduce((acc, r) => acc + parseFloat(r[key] ?? "0"), 0);

        const avg = (key: keyof MetaInsight) =>
          rows.length ? sum(key) / rows.length : 0;

        const spendArr = rows.map((r) => parseFloat(r.spend ?? "0"));
        const impArr = rows.map((r) => parseFloat(r.impressions ?? "0"));
        const clickArr = rows.map((r) => parseFloat(r.clicks ?? "0"));
        const ctrArr = rows.map((r) => parseFloat(r.ctr ?? "0"));

        setMetrics([
          {
            label: "Ad Spend",
            value: sum("spend"),
            format: "currency",
            sparklineData: spendArr.length >= 2 ? spendArr : undefined,
          },
          {
            label: "Impressions",
            value: sum("impressions"),
            format: "compact",
            sparklineData: impArr.length >= 2 ? impArr : undefined,
          },
          {
            label: "Clicks",
            value: sum("clicks"),
            format: "number",
            sparklineData: clickArr.length >= 2 ? clickArr : undefined,
          },
          {
            label: "Avg. CTR",
            value: avg("ctr"),
            format: "percentage",
            sparklineData: ctrArr.length >= 2 ? ctrArr : undefined,
          },
        ]);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch metrics");
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} className="p-5">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/50">
                {["Ad Spend", "Impressions", "Clicks", "Avg. CTR"][i]}
              </p>
              <p className="text-2xl font-semibold text-muted-foreground/40">—</p>
              <p className="text-xs text-muted-foreground/40">Connect Meta Ads</p>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <GlassCard glow className="p-5">
                <MetricDisplay
                  label={["Ad Spend", "Impressions", "Clicks", "Avg. CTR"][i]}
                  value={0}
                  format="number"
                  loading
                />
              </GlassCard>
            </motion.div>
          ))
        : (metrics ?? []).map((m) => (
            <motion.div key={m.label} variants={itemVariants}>
              <GlassCard glow className="p-5">
                <MetricDisplay
                  label={m.label}
                  value={m.value}
                  format={m.format}
                  currencyCode={currency}
                  trend={m.trend}
                  sparklineData={m.sparklineData}
                />
              </GlassCard>
            </motion.div>
          ))}
    </motion.div>
  );
}
