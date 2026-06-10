import { cn } from "@/lib/utils";

type StatusDotVariant =
  | "active"
  | "inactive"
  | "running"
  | "failed"
  | "completed"
  | "pending"
  | "paused"
  | "error"
  | "disconnected";

const variantStyles: Record<StatusDotVariant, string> = {
  active: "bg-emerald-500",
  completed: "bg-emerald-500",
  inactive: "bg-slate-400",
  disconnected: "bg-slate-400",
  paused: "bg-yellow-400",
  pending: "bg-yellow-400",
  running: "bg-blue-500 animate-pulse",
  failed: "bg-red-500",
  error: "bg-red-500",
};

interface StatusDotProps {
  status: StatusDotVariant;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        variantStyles[status] ?? "bg-slate-400",
        className
      )}
    />
  );
}
