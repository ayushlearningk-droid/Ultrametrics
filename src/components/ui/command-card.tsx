"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type CommandCardProps = Omit<HTMLMotionProps<"div">, "ref" | "children"> & {
  disabled?: boolean;
  children?: React.ReactNode;
};

/**
 * Obsidian design system — CTA surface component.
 * Brand-tinted card with spring hover lift and top-edge highlight.
 * Use for primary actions, quick actions, and featured destinations.
 */
const CommandCard = React.forwardRef<HTMLDivElement, CommandCardProps>(
  ({ className, disabled = false, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={disabled ? undefined : { scale: 1.018, y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "border border-brand/[0.22] bg-brand/[0.05]",
        "transition-colors duration-200",
        !disabled && "cursor-pointer hover:border-brand/50 hover:bg-brand/[0.09]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {/* Top-edge iridescent highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
      />
      {children}
    </motion.div>
  )
);
CommandCard.displayName = "CommandCard";

export { CommandCard };
