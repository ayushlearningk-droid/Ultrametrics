"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { AreaChart } from "@/components/ui/area-chart";

interface SyncActivityChartProps {
  data: { label: string; value: number }[];
}

export function SyncActivityChart({ data }: SyncActivityChartProps) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Sync Activity</p>
          <p className="text-xs text-muted-foreground">Records synced per day — last 14 days</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-brand" />
          <span className="text-xs text-muted-foreground">Records</span>
        </div>
      </div>
      <AreaChart
        data={data}
        color="#4F8BEE"
        height={96}
        showGrid
        showTooltip
        animated
        formatValue={(v) => v.toLocaleString()}
      />
    </GlassCard>
  );
}
