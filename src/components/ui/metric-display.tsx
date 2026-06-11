"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SparkLine } from "@/components/ui/spark-line";

export type MetricFormat = "number" | "currency" | "percentage" | "compact";

interface MetricDisplayProps {
  label: string;
  value: number;
  format?: MetricFormat;
  currencyCode?: string;
  trend?: number;
  sparklineData?: number[];
  loading?: boolean;
  className?: string;
}

function formatValue(
  v: number,
  format: MetricFormat,
  currencyCode = "USD"
): string {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(v);
  }
  if (format === "percentage") {
    return `${v.toFixed(2)}%`;
  }
  if (format === "compact") {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString();
  }
  return v.toLocaleString();
}

export function MetricDisplay({
  label,
  value,
  format = "number",
  currencyCode = "USD",
  trend,
  sparklineData,
  loading = false,
  className,
}: MetricDisplayProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState("—");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = spring.on("change", (v) => {
      if (mounted.current) setDisplay(formatValue(v, format, currencyCode));
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [spring, format, currencyCode]);

  useEffect(() => {
    if (!loading) motionValue.set(value);
  }, [value, loading, motionValue]);

  const trendPositive = trend !== undefined && trend >= 0;
  const trendColor = trendPositive ? "text-emerald-400" : "text-red-400";
  const TrendIcon = trendPositive ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="h-3.5 w-24 animate-pulse rounded-md bg-white/[0.06]" />
        <div className="h-8 w-32 animate-pulse rounded-md bg-white/[0.08]" />
        {sparklineData !== undefined && (
          <div className="h-6 w-20 animate-pulse rounded-md bg-white/[0.04]" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold leading-none tracking-tight text-foreground">
        {display}
      </p>
      <div className="flex items-center justify-between">
        {trend !== undefined ? (
          <span className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend).toFixed(1)}%
          </span>
        ) : (
          <span />
        )}
        {sparklineData && sparklineData.length >= 2 && (
          <SparkLine
            data={sparklineData}
            width={72}
            height={22}
            color={trendPositive ? "#34D399" : "#F87171"}
          />
        )}
      </div>
    </div>
  );
}
