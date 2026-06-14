"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type HealthStatus = "active" | "syncing" | "error" | "paused" | "inactive";

const STATUS_CONFIG: Record<
  HealthStatus,
  { color: string; label: string; pulse: boolean }
> = {
  active:   { color: "#34D399", label: "Healthy",  pulse: true  },
  syncing:  { color: "#4F8BEE", label: "Syncing",  pulse: true  },
  error:    { color: "#F87171", label: "Error",    pulse: false },
  paused:   { color: "#FBBF24", label: "Paused",   pulse: false },
  inactive: { color: "#6B7280", label: "Inactive", pulse: false },
};

interface HealthRingProps {
  status: HealthStatus;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function HealthRing({
  status,
  size = 28,
  showLabel = false,
  className,
}: HealthRingProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  const center = size / 2;
  const dotR = 3.5;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {/* Pulse ring */}
        {config.pulse && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{ scale: [1, 1.7], opacity: [0.35, 0] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
              repeatDelay: 0.4,
            }}
          />
        )}

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
          aria-hidden
        >
          {/* Outer ring */}
          <circle
            cx={center}
            cy={center}
            r={center - 2}
            stroke={config.color}
            strokeWidth={1.5}
            strokeOpacity={0.25}
          />
          {/* Center dot */}
          <circle cx={center} cy={center} r={dotR} fill={config.color} />
        </svg>
      </div>

      {showLabel && (
        <span
          className="text-xs font-medium leading-none"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
