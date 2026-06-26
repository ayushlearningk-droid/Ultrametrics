import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardPageSkeletonProps {
  className?: string;
  variant?: "stack" | "hero" | "compact";
}

export function DashboardPageSkeleton({
  className,
  variant = "stack",
}: DashboardPageSkeletonProps) {
  if (variant === "compact") {
    return (
      <div className={cn("mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 md:px-6", className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={cn("mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8", className)}>
        <div className="surface-ai shadow-floating flex flex-col gap-4 p-6 md:p-8">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="grid gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8", className)}>
      <div className="surface-ai shadow-floating flex flex-col gap-4 p-6 md:p-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
