"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { CommandCard } from "@/components/ui/command-card";
import { cn } from "@/lib/utils";

type SyncStatus = "idle" | "loading" | "done";

async function triggerSync(endpoint: string): Promise<{ ok: boolean; error?: string; rowsWritten?: number }> {
  const r = await fetch(endpoint, { method: "POST" });
  const body = await r.json().catch(() => ({})) as { ok?: boolean; error?: string; rowsWritten?: number };
  if (!r.ok) return { ok: false, error: body.error ?? "Sync failed" };
  return { ok: true, rowsWritten: body.rowsWritten };
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

export function QuickActions() {
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  async function handleSyncAll() {
    setSyncStatus("loading");

    const [metaResult, adsResult] = await Promise.allSettled([
      triggerSync("/api/sync/meta-to-google-sheets"),
      triggerSync("/api/sync/google-ads-to-google-sheets"),
    ]);

    const metaOk = metaResult.status === "fulfilled" && metaResult.value.ok;
    const adsOk = adsResult.status === "fulfilled" && adsResult.value.ok;

    if (metaOk && adsOk) {
      const rows =
        (metaResult.status === "fulfilled" ? metaResult.value.rowsWritten ?? 0 : 0) +
        (adsResult.status === "fulfilled" ? adsResult.value.rowsWritten ?? 0 : 0);
      toast.success("All sources synced", {
        description: `${rows.toLocaleString()} rows written to Google Sheets`,
      });
    } else if (!metaOk && !adsOk) {
      toast.error("Sync failed", { description: "Both sources failed. Check connector status." });
    } else {
      toast.warning("Partial sync", {
        description: metaOk ? "Meta synced. Google Ads failed." : "Google Ads synced. Meta failed.",
      });
    }

    setSyncStatus("done");
    setTimeout(() => setSyncStatus("idle"), 3000);
  }

  const isSyncing = syncStatus === "loading";

  return (
    <GlassCard className="flex flex-col">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <p className="text-sm font-semibold">Quick Actions</p>
        <p className="text-xs text-muted-foreground">Common operations</p>
      </div>

      <div className="flex-1 p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-2.5"
        >
          <motion.div variants={itemVariants}>
            <CommandCard
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="p-4"
            >
              <ActionRow
                icon={
                  <RefreshCw
                    className={cn("h-4 w-4 text-brand", isSyncing && "animate-spin")}
                  />
                }
                title={isSyncing ? "Syncing…" : "Sync All Sources"}
                description={isSyncing ? "Pushing to Google Sheets" : "Meta + Google Ads → Sheets"}
              />
            </CommandCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <CommandCard
              onClick={() => router.push("/dashboard/connectors/google")}
              className="p-4"
            >
              <ActionRow
                icon={<ExternalLink className="h-4 w-4 text-brand" />}
                title="Open Destination"
                description="View Google Sheets connector"
              />
            </CommandCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <CommandCard
              onClick={() => router.push("/dashboard/connectors")}
              className="p-4"
            >
              <ActionRow
                icon={<Plus className="h-4 w-4 text-brand" />}
                title="Add Source"
                description="Connect a new data source"
              />
            </CommandCard>
          </motion.div>
        </motion.div>
      </div>
    </GlassCard>
  );
}

function ActionRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
