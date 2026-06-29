"use client";

/**
 * AI Studio Shell — Top Global Intent Bar (Sprint 63I).
 *
 * Reserves the future Prompt Workspace. A calm, breathing intent field + a ⌘K
 * affordance + a right-side anchor for the activity-rail toggle. L3 AI surface.
 *
 * SCOPE: shell only. The field is INERT this sprint — no generation, no Ask
 * dispatch, no business logic. It establishes the surface and keyboard entry
 * point; the Prompt Workspace mounts here later without shell changes.
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, PanelRight } from "lucide-react";
import { fadeIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ShellRegion } from "./shell-region";
import { useStudioShell } from "./shell-context";

export function StudioIntentBar() {
  const reduce = useReducedMotion();
  const { toggleRegion, isCollapsed } = useStudioShell();
  const [value, setValue] = useState("");
  const activityHidden = isCollapsed("activity");

  return (
    <ShellRegion
      id="intent"
      depth="L3"
      as="header"
      ariaLabel="Intent bar"
      className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4"
    >
      <motion.div
        variants={fadeIn}
        initial={reduce ? false : "hidden"}
        animate="visible"
        className="surface-ai flex h-10 flex-1 items-center gap-2.5 rounded-xl px-3"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-brand" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // Inert placeholder this sprint — the Prompt Workspace mounts here later.
          readOnly
          aria-label="Describe what you want to create"
          placeholder="Describe what you want to create…"
          className="min-w-0 flex-1 cursor-default bg-transparent type-body text-foreground outline-none placeholder:text-foreground-muted"
        />
        <kbd className="hidden shrink-0 rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono type-caption text-foreground-muted sm:inline">
          ⌘K
        </kbd>
      </motion.div>

      <button
        type="button"
        onClick={() => toggleRegion("activity")}
        aria-pressed={!activityHidden}
        aria-label={activityHidden ? "Show activity rail" : "Hide activity rail"}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
          activityHidden
            ? "border-white/[0.08] text-foreground-muted hover:bg-white/[0.04] hover:text-foreground"
            : "border-brand/30 bg-brand/10 text-brand"
        )}
      >
        <PanelRight className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </button>
    </ShellRegion>
  );
}
