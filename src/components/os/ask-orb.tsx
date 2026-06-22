"use client";

/**
 * Ask Ultrametrics — floating Ask Orb (Sprint 3A, v1).
 *
 * A deliberate, desktop-only entry point to Ask: a fixed bottom-right glass orb
 * that opens the drawer (revealing the already-hydrated last conversation —
 * instant, no fetch on click). Renders only when the drawer is closed and shows
 * an emerald unread dot when a reply finished while it was closed (hasUnread).
 *
 * Presentational only — reads { isOpen, open, hasUnread } from useAsk(); all
 * unread logic lives in AskProvider. Motion is a pure fade (no shared-layout
 * morph); the drawer's own slide animation is untouched. Hidden on mobile,
 * where the bottom command bar is the entry point.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAsk } from "@/components/os/ask-provider";

export function AskOrb() {
  const { isOpen, open, hasUnread } = useAsk();

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          aria-label={
            hasUnread
              ? "Open Ask Ultrametrics (new reply)"
              : "Open Ask Ultrametrics"
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="surface-elevated fixed bottom-6 right-6 z-[55] hidden h-12 w-12 items-center justify-center rounded-full text-brand shadow-[0_0_24px_0] shadow-brand/20 ring-1 ring-brand/30 transition-[box-shadow,color] hover:text-brand hover:shadow-brand/30 hover:ring-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:flex"
        >
          <Sparkles className="h-5 w-5" />
          {hasUnread && (
            <span
              aria-hidden
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand shadow-[0_0_6px_0] shadow-brand/60"
            />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
