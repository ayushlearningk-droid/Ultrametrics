"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { HealthRing } from "@/components/ui/health-ring";
import { SparkLine } from "@/components/ui/spark-line";
import type { HealthStatus } from "@/components/ui/health-ring";

export type ConnectorTokenHealth = "ok" | "expired" | "missing" | "sync_failed";

export interface ConnectorHealthItem {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  /** Supabase connector status */
  connectorStatus: "active" | "paused" | "error" | "disconnected";
  /** Token-level health for providers that use stored OAuth tokens */
  tokenHealth: ConnectorTokenHealth;
  gradient: string;
  lastSyncedAt: string | null;
  recentRecords: number[];
  reconnectHref?: string;
}

interface ConnectorHealthPanelProps {
  connectors: ConnectorHealthItem[];
}

interface HealthDisplay {
  ring: HealthStatus;
  label: string;
  warn: boolean;
}

function resolveHealth(item: ConnectorHealthItem): HealthDisplay {
  // Hard connector-level errors take precedence
  if (item.connectorStatus === "error") {
    return { ring: "error", label: "Sync failed", warn: true };
  }
  if (item.connectorStatus === "paused") {
    return { ring: "paused", label: "Paused", warn: false };
  }
  if (item.connectorStatus === "disconnected") {
    return { ring: "inactive", label: "Disconnected", warn: false };
  }

  // Active connector — check token health
  if (item.tokenHealth === "expired") {
    return { ring: "error", label: "Token expired", warn: true };
  }
  if (item.tokenHealth === "missing") {
    return { ring: "error", label: "Needs reconnect", warn: true };
  }

  return { ring: "active", label: "Connected", warn: false };
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

const SPARK_COLORS: Record<string, string> = {
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
              const health = resolveHealth(connector);
              const sparkColor = SPARK_COLORS[connector.provider] ?? "#4F8BEE";

              return (
                <li key={connector.id}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                      "transition-colors",
                      health.warn
                        ? "border-red-500/20 bg-red-500/[0.04] hover:border-red-500/30"
                        : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.1] hover:bg-white/[0.04]"
                    )}
                  >
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
                      <div className="flex items-center gap-1.5">
                        {health.warn && (
                          <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />
                        )}
                        <p className={cn(
                          "text-xs",
                          health.warn ? "text-red-400" : "text-muted-foreground"
                        )}>
                          {health.label}
                          {!health.warn && connector.lastSyncedAt && (
                            <> · {relativeTime(connector.lastSyncedAt)}</>
                          )}
                          {health.warn && connector.reconnectHref && (
                            <Link
                              href={connector.reconnectHref}
                              className="ml-1.5 underline underline-offset-2 hover:text-red-300"
                            >
                              Reconnect
                            </Link>
                          )}
                        </p>
                      </div>
                    </div>

                    {!health.warn && connector.recentRecords.length >= 2 && (
                      <SparkLine
                        data={connector.recentRecords}
                        width={56}
                        height={20}
                        color={sparkColor}
                        className="shrink-0 opacity-70"
                      />
                    )}

                    <HealthRing status={health.ring} size={24} className="shrink-0" />
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
