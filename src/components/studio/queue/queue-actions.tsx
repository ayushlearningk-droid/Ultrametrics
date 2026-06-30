"use client";

/**
 * Production Generation Queue — QueueActions (Sprint 63).
 * Status-aware item actions wired to the queue state (cancel/retry/pause/
 * resume/move-priority) + view details. Keyboard + focus.
 */

import { Pause, Play, X, RotateCcw, ChevronUp, Eye, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueue } from "./queue-context";
import type { QueueItem } from "./queue-data";

function Btn({ icon: Icon, label, onClick, tone }: { icon: LucideIcon; label: string; onClick: () => void; tone?: "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.06]",
        tone === "danger" ? "hover:text-red-400" : "hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function QueueActions({ item }: { item: QueueItem }) {
  const { pause, resume, cancel, retry, movePriority, setSelectedId } = useQueue();
  return (
    <div className="flex items-center gap-0.5">
      {item.status === "running" && <Btn icon={Pause} label="Pause" onClick={() => pause(item.id)} />}
      {item.status === "paused" && <Btn icon={Play} label="Resume" onClick={() => resume(item.id)} />}
      {item.status === "queued" && <Btn icon={ChevronUp} label="Move up priority" onClick={() => movePriority(item.id)} />}
      {(item.status === "failed" || item.status === "cancelled") && <Btn icon={RotateCcw} label="Retry" onClick={() => retry(item.id)} />}
      {item.status !== "completed" && item.status !== "cancelled" && (
        <Btn icon={X} label="Cancel" tone="danger" onClick={() => cancel(item.id)} />
      )}
      <Btn icon={Eye} label="View details" onClick={() => setSelectedId(item.id)} />
    </div>
  );
}
