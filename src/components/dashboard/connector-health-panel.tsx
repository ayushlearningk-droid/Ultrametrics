"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { HealthRing } from "@/components/ui/health-ring";
import { SparkLine } from "@/components/ui/spark-line";
import type { HealthStatus } from "@/components/ui/health-ring";
import type { ConnectorStatus } from "@/types/database";

interface ConnectorHealthItem {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  status: ConnectorStatus;
  gradient: string;
  lastSyncedAt: string | null;
  recentRecords: number[];
  href?: string;
}

interface ConnectorHealthPanelProps {
  connectors: ConnectorHealthItem[];
}

function connectorToHealthStatus(status: ConnectorStatus): HealthStatus {
  if (status === "active") return "active";
  if (status === "error") return "error";
  if (status === "paused") return "paused";
  return "inactive";
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never synced";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const GRADIENT_COLORS: Record<string, string> = {
  meta_ads: "#4F8BEE",
  google_ads: "#34A853",
  google_sheets: "#0F9D58",
};

export function ConnectorHealthPanel({ connectors }: ConnectorHealthPanelProps) {
  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Connector Health</p>
          <p className="text-xs text-muted-foreground">Live status of all sources</p>
        </div>
        <Link
          href="/dashboard/connectors"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        {connectors.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground/60">No connectors configured</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {connectors.map((connector) => {
              const healthStatus = connectorToHealthStatus(connector.status);
              const sparkColor =
                GRADIENT_COLORS[connector.provider] ?? "#4F8BEE";

              return (
                <li key={connector.id}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5",
                      "transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
                    )}
                  >
                    {/* Brand gradient dot */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white text-xs font-bold",
                        connector.gradient
                      )}
                    >
                      {connector.providerName.slice(0, 2)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {connector.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(connector.lastSyncedAt)}
                      </p>
                    </div>

                    {connector.recentRecords.length >= 2 && (
                      <SparkLine
                        data={connector.recentRecords}
                        width={56}
                        height={20}
                        color={sparkColor}
                        className="shrink-0 opacity-70"
                      />
                    )}

                    <HealthRing status={healthStatus} size={24} className="shrink-0" />
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
