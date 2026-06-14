import { TrendingUp } from "lucide-react";

/**
 * Non-interactive product preview shown on the right side of the auth split.
 * Reuses Mission Control's spatial language (floating hero, pulse, edge-lit
 * panels, evidence chip) to sell the product. Pure presentation — no data,
 * no logic, all illustrative and clearly a marketing surface.
 */
export function AuthPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ambient light pools (static — environment language) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 18% 12%, hsl(var(--amb-blue) / 0.18) 0%, transparent 60%), radial-gradient(70% 64% at 92% 96%, hsl(var(--amb-violet) / 0.16) 0%, transparent 58%)",
        }}
      />

      {/* floating preview stack */}
      <div className="relative flex h-full flex-col justify-center gap-5 px-10 lg:px-14 xl:px-20">

        {/* mini mission-control hero (L3) */}
        <div className="surface-elevated relative overflow-hidden anim-settle shadow-[0_28px_80px_-12px_hsl(240_40%_1%/0.7)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
          {/* status row */}
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-3.5">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="anim-pulse absolute inline-flex h-2.5 w-2.5 rounded-full bg-brand/40" />
              <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-brand shadow-[0_0_8px_2px] shadow-brand/50" />
            </span>
            <span className="type-eyebrow text-foreground-muted">
              Ultrametrics is monitoring
            </span>
          </div>
          {/* finding */}
          <div className="px-6 py-6">
            <p className="type-eyebrow text-foreground-muted/70">
              Ultrametrics detected 1 opportunity
            </p>
            <h3 className="mt-2.5 type-display text-balance">
              Meta Ads gaining momentum.
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.07] px-3 py-1 type-caption font-mono tabular-nums text-brand">
                <span className="opacity-70">CTR</span>
                <span className="font-semibold">+18%</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.07] px-3 py-1 type-caption font-mono tabular-nums text-brand">
                <span className="opacity-70">Spend</span>
                <span className="font-semibold">+48%</span>
              </span>
            </div>
          </div>
        </div>

        {/* two floating metric panels (L2) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="panel p-5">
            <p className="type-eyebrow text-foreground-muted/80">Spend</p>
            <p className="mt-2 font-mono type-display tabular-nums">$406K</p>
            <div className="mt-2 flex items-center gap-1 text-brand">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-mono type-caption tabular-nums">+48%</span>
            </div>
          </div>
          <div className="panel p-5">
            <p className="type-eyebrow text-foreground-muted/80">ROAS</p>
            <p className="mt-2 font-mono type-display tabular-nums">3.2×</p>
            <div className="mt-2 flex items-center gap-1 text-brand">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-mono type-caption tabular-nums">+9%</span>
            </div>
          </div>
        </div>

        {/* illustrative marker */}
        <p className="type-caption text-foreground-muted/40">
          Preview · illustrative data
        </p>
      </div>
    </div>
  );
}
