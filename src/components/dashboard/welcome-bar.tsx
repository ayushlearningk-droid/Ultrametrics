"use client";

import { useMemo } from "react";
import { Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeBarProps {
  userName: string | null;
  workspaceName: string;
  activeSourcesCount: number;
  recentSyncsCount: number;
  className?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return "";
  return fullName.split(" ")[0];
}

export function WelcomeBar({
  userName,
  workspaceName,
  activeSourcesCount,
  recentSyncsCount,
  className,
}: WelcomeBarProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const firstName = getFirstName(userName);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {workspaceName} · Mission Control
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Pill
          icon={<Zap className="h-3 w-3" />}
          label={`${activeSourcesCount} source${activeSourcesCount !== 1 ? "s" : ""} active`}
          active={activeSourcesCount > 0}
        />
        <Pill
          icon={<Activity className="h-3 w-3" />}
          label={`${recentSyncsCount} recent sync${recentSyncsCount !== 1 ? "s" : ""}`}
          active={recentSyncsCount > 0}
        />
      </div>
    </div>
  );
}

function Pill({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-white/[0.08] bg-white/[0.04] text-muted-foreground"
      )}
    >
      {icon}
      {label}
    </span>
  );
}
