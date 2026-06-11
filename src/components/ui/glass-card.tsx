import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

/**
 * Obsidian design system — primary surface component.
 * Glassmorphic card with subtle border and backdrop blur.
 * Use `glow` for cards that benefit from brand hover glow (metric cards, CTAs).
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm",
        "transition-all duration-200",
        glow
          ? "hover:border-brand/[0.35] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-brand/[0.07]"
          : "hover:border-white/[0.13] hover:bg-white/[0.04]",
        className
      )}
      {...props}
    />
  )
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
