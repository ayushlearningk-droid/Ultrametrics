/**
 * Obsidian design system — inline trend visualization.
 * Pure SVG, RSC-compatible. No external chart deps.
 */

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

function buildPath(data: number[], w: number, h: number): string {
  if (data.length < 2) return "";
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const uw = w - pad * 2;
  const uh = h - pad * 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * uw;
    const y = pad + uh - ((v - min) / range) * uh;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return pts.join(" L ");
}

export function SparkLine({
  data,
  width = 80,
  height = 24,
  color = "currentColor",
  className,
}: SparkLineProps) {
  if (!data || data.length < 2) return null;

  const pad = 2;
  const path = buildPath(data, width, height);
  // Area fill: close the path down to the baseline
  const lastX = (pad + (((data.length - 1) / (data.length - 1)) * (width - pad * 2))).toFixed(1);
  const areaPath = `M ${path} L ${lastX},${height} L ${pad},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
      className={className}
    >
      {/* Area fill */}
      <path d={areaPath} fill={color} fillOpacity={0.1} />
      {/* Line */}
      <path
        d={`M ${path}`}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
