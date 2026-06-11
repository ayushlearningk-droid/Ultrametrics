"use client";

import { useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
  formatValue?: (v: number) => string;
}

/** Catmull-Rom → cubic bezier smooth line */
function smoothLinePath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const d: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
    );
  }
  return d.join(" ");
}

export function AreaChart({
  data,
  color = "#4F8BEE",
  height = 120,
  showGrid = true,
  showTooltip = true,
  animated = true,
  className,
  formatValue = (v) => v.toLocaleString(),
}: AreaChartProps) {
  const gradId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; label: string; value: string;
  } | null>(null);

  if (!data || data.length < 2) {
    return (
      <div className={cn("flex items-end justify-center", className)} style={{ height }}>
        <p className="text-xs text-muted-foreground/40">No data</p>
      </div>
    );
  }

  const W = 360;
  const padL = 4;
  const padR = 4;
  const padT = 12;
  const padB = 4;
  const innerW = W - padL - padR;
  const innerH = height - padT - padB;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts: [number, number][] = data.map((d, i) => [
    padL + (i / (data.length - 1)) * innerW,
    padT + innerH - ((d.value - min) / range) * innerH,
  ]);

  const linePath = smoothLinePath(pts);
  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaPath = `${linePath} L ${lastPt[0].toFixed(1)} ${(padT + innerH).toFixed(1)} L ${firstPt[0].toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  // Grid lines (3 horizontal)
  const gridLines = showGrid
    ? [0.25, 0.5, 0.75].map((t) => padT + innerH - t * innerH)
    : [];

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!showTooltip || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((mx - padL) / innerW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    const pt = pts[clamped];
    setTooltip({
      x: pt[0],
      y: pt[1],
      label: data[clamped].label,
      value: formatValue(data[clamped].value),
    });
  }

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="w-full overflow-visible"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        aria-hidden
      >
        <defs>
          <linearGradient id={`ag-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={padL}
            y1={y}
            x2={W - padR}
            y2={y}
            stroke="currentColor"
            strokeWidth={0.5}
            strokeOpacity={0.08}
            className="text-foreground"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#ag-${gradId})`} />

        {/* Line stroke */}
        {animated ? (
          <motion.path
            d={linePath}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        ) : (
          <path
            d={linePath}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover crosshair + dot */}
        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              y1={padT}
              x2={tooltip.x}
              y2={padT + innerH}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <circle cx={tooltip.x} cy={tooltip.y} r={4} fill={color} />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={6}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.4}
            />
          </>
        )}
      </svg>

      {/* Tooltip bubble */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/[0.1] bg-[hsl(var(--card))] px-2.5 py-1.5 shadow-xl"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: "translate(-50%, -110%)",
          }}
        >
          <p className="text-[10px] text-muted-foreground">{tooltip.label}</p>
          <p className="font-mono text-sm font-semibold">{tooltip.value}</p>
        </div>
      )}
    </div>
  );
}
