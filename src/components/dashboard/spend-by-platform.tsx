"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

interface PlatformRecord {
  provider: string;
  providerName: string;
  records: number;
  color: string;
}

interface SpendByPlatformProps {
  data: PlatformRecord[];
}

export function SpendByPlatform({ data }: SpendByPlatformProps) {
  const max = Math.max(...data.map((d) => d.records), 1);

  return (
    <GlassCard className="flex flex-col">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <p className="text-sm font-semibold">Records by Source</p>
        <p className="text-xs text-muted-foreground">Total records synced per connector</p>
      </div>

      <div className="flex-1 p-5">
        {data.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground/60">No data yet</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {data.map((item, i) => {
              const pct = max > 0 ? (item.records / max) * 100 : 0;
              return (
                <li key={item.provider}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium">{item.providerName}</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {item.records.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        delay: i * 0.1,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}
