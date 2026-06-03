"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MetaInsightRow = {
  impressions?: string | number;
  clicks?: string | number;
  spend?: string | number;
  reach?: string | number;
  ctr?: string | number;
  cpc?: string | number;
  cpm?: string | number;
  [key: string]: unknown;
};

type MetaInsightsResponse = {
  success?: boolean;
  insights?: MetaInsightRow[];
  error?: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized === "") {
      return Number.NaN;
    }

    return Number(normalized);
  }

  return Number.NaN;
}

function formatNumber(value: string | number | null | undefined) {
  const numericValue = toNumber(value);

  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatCurrency(value: string | number | null | undefined) {
  const numericValue = toNumber(value);

  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatPercent(value: string | number | null | undefined) {
  const numericValue = toNumber(value);

  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return `${(numericValue * 100).toFixed(2)}%`;
}

export function MetaAdsOverviewCard() {
  const [data, setData] = useState<MetaInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInsights() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/meta/test-insights", {
          cache: "no-store",
        });

        const payload = (await response.json()) as MetaInsightsResponse;

        if (!response.ok || payload.error) {
          throw new Error(payload.error ?? "Unable to load Meta Ads insights");
        }

        if (isMounted) {
          setData(payload);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Meta Ads insights"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInsights();

    return () => {
      isMounted = false;
    };
  }, []);

  const insight = useMemo(() => data?.insights?.[0], [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Meta Ads overview</CardTitle>
          <CardDescription>
            Last 30 days performance for your connected Meta ad account.
          </CardDescription>
        </div>
        <Badge variant="secondary">Live</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : !insight ? (
          <p className="text-sm text-muted-foreground">
            No Meta Ads insights were returned for this workspace.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label="Spend" value={formatCurrency(insight.spend)} />
            <Metric
              label="Impressions"
              value={formatNumber(insight.impressions)}
            />
            <Metric label="Clicks" value={formatNumber(insight.clicks)} />
            <Metric label="Reach" value={formatNumber(insight.reach)} />
            <Metric label="CTR" value={formatPercent(insight.ctr)} />
            <Metric label="CPC" value={formatCurrency(insight.cpc)} />
            <Metric label="CPM" value={formatCurrency(insight.cpm)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
