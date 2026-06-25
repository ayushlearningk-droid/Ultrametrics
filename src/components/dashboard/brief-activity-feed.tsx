/**
 * Morning Brief — Activity Feed (Phase B).
 *
 * Flat, panel-style timeline of recent sync runs. Presentation only: it takes
 * already-shaped activity items (joined in the dashboard page from the existing
 * sync-job + connector data) and renders them. No GlassCard, no blur, no
 * gradients, no 3D. Emerald = positive/active, muted red = failure, slate =
 * neutral — per the approved colour rules. Typography uses the three approved
 * tokens only (type-body / type-caption / type-eyebrow).
 */

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { SyncJobStatus } from "@/types/database";

export interface ActivityItem {
  id: string;
  status: SyncJobStatus;
  /** Connector name (joined in the page). */
  name: string;
  provider: string;
  records: number;
  createdAt: string;
  completedAt: string | null;
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

/** Emerald (positive/active) · muted red (failure) · slate (neutral). */
const STATUS_ICON: Record<SyncJobStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-brand" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-400/80" />,
  running: (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      <span className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-brand/40" />
      <span className="h-2 w-2 rounded-full bg-brand" />
    </span>
  ),
  pending: <Clock className="h-3.5 w-3.5 text-slate-300" />,
  cancelled: <Clock className="h-3.5 w-3.5 text-slate-300" />,
};

export function BriefActivityFeed({ items }: { items: ActivityItem[] }) {
  const sliced = items.slice(0, 8);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <span className="type-caption text-foreground-muted">Recent sync runs</span>
        <Link
          href="/dashboard/sync-jobs"
          className="flex items-center gap-1 type-caption text-foreground-muted transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {sliced.length === 0 ? (
        <div className="flex h-24 items-center justify-center">
          <p className="type-caption text-foreground-muted">No sync activity yet</p>
        </div>
      ) : (
        <ul className="relative space-y-0 p-4">
          {/* Timeline rail */}
          <li
            aria-hidden
            className="pointer-events-none absolute bottom-7 left-[30px] top-7 w-px bg-white/[0.06]"
          />
          {sliced.map((item) => (
            <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
              <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-background">
                {STATUS_ICON[item.status]}
              </div>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-1">
                <div className="min-w-0">
                  <p className="truncate type-body text-foreground">{item.name}</p>
                  <p className="type-caption text-foreground-muted">
                    {item.provider} · {item.records.toLocaleString()} records
                  </p>
                </div>
                <span
                  className="shrink-0 type-caption tabular-nums text-foreground-muted"
                  title={new Date(item.createdAt).toLocaleString()}
                >
                  {relativeTime(item.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
