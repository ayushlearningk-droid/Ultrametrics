import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryAction,
  className,
}: DashboardEmptyStateProps) {
  return (
    <div className={cn("mx-auto flex max-w-3xl justify-center px-4 py-16 md:px-6", className)}>
      <div className="surface-ai shadow-floating flex w-full max-w-2xl flex-col items-center justify-center rounded-[24px] border border-emerald-500/15 px-6 py-16 text-center sm:px-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {(actionLabel || actionHref || secondaryAction) && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {actionHref && actionLabel ? (
              <Button variant="brand" asChild>
                <Link href={actionHref}>
                  {actionLabel}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  );
}
