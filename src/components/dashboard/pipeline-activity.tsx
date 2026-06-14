"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import type { SyncJobStatus } from "@/types/database";

interface PipelineJob {
  id: string;
  status: SyncJobStatus;
  connectorName: string;
  providerName: string;
  records: number;
  createdAt: string;
  completedAt: string | null;
}

interface PipelineActivityProps {
  jobs: PipelineJob[];
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function duration(start: string, end: string | null): string | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return "<1s";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m`;
}

const STATUS_ICON: Record<SyncJobStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  running: (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      <span className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-brand/40" />
      <span className="h-2 w-2 rounded-full bg-brand" />
    </span>
  ),
  pending: <Clock className="h-3.5 w-3.5 text-yellow-400" />,
  cancelled: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

export function PipelineActivity({ jobs }: PipelineActivityProps) {
  const sliced = jobs.slice(0, 8);

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Pipeline Activity</p>
          <p className="text-xs text-muted-foreground">Recent sync runs</p>
        </div>
        <Link
          href="/dashboard/sync-jobs"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {sliced.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground/60">No sync activity yet</p>
          </div>
        ) : (
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="relative space-y-0"
          >
            {/* Timeline line */}
            <li
              aria-hidden
              className="pointer-events-none absolute left-[17px] top-4 bottom-4 w-px bg-white/[0.06]"
            />

            {sliced.map((job) => {
              const dur = duration(job.createdAt, job.completedAt);
              return (
                <motion.li
                  key={job.id}
                  variants={itemVariants}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  {/* Status icon on the timeline */}
                  <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-background">
                    {STATUS_ICON[job.status]}
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight">
                          {job.connectorName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {job.providerName} ·{" "}
                          {job.records.toLocaleString()} records
                          {dur && ` · ${dur}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-xs text-muted-foreground/60"
                        )}
                      >
                        {relativeTime(job.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </GlassCard>
  );
}
