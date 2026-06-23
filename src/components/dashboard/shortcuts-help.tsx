"use client";

/**
 * Ultrametrics — Keyboard Shortcuts help modal (Sprint 6, Task 2).
 *
 * Triggered by "?" (Shift+/). A Linear/Arc-style overlay listing the global
 * shortcut scheme grouped into Navigation / AI / System. Closes on Esc and on
 * outside click. Renders at z-[70] so it sits above the Ask drawer (z-[61]).
 *
 * Presentational only — open state is owned by the dashboard shell.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  label: string;
}

const SECTIONS: { heading: string; items: Shortcut[] }[] = [
  {
    heading: "Navigation",
    items: [
      { keys: ["G", "B"], label: "Brief" },
      { keys: ["G", "C"], label: "Connectors" },
      { keys: ["G", "R"], label: "Reports" },
      { keys: ["G", "T"], label: "Timeline" },
      { keys: ["G", "S"], label: "Settings" },
    ],
  },
  {
    heading: "AI",
    items: [
      { keys: ["A"], label: "Open Ask" },
      { keys: ["N"], label: "New Conversation" },
      { keys: ["/"], label: "Search Conversations" },
      { keys: ["Shift", "A"], label: "Focus Composer" },
    ],
  },
  {
    heading: "System",
    items: [
      { keys: ["⌘", "K"], label: "Command Palette" },
      { keys: ["Esc"], label: "Close Active Surface" },
    ],
  },
];

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  // Esc closes the modal (and stops the event so nothing underneath reacts).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — outside click closes */}
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed left-1/2 top-[18%] z-[70] w-full max-w-md -translate-x-1/2"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            role="dialog"
            aria-label="Keyboard shortcuts"
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[hsl(222_44%_6%)] shadow-2xl shadow-black/60">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                <div className="flex flex-col">
                  <span className="type-body font-semibold tracking-tight">
                    Keyboard Shortcuts
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-foreground-muted/60">
                    Ultrametrics AI OS
                  </span>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sections */}
              <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
                {SECTIONS.map((section) => (
                  <div key={section.heading}>
                    <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-foreground-muted/60">
                      {section.heading}
                    </p>
                    <ul className="space-y-0.5">
                      {section.items.map((item) => (
                        <li
                          key={item.label}
                          className="flex items-center justify-between rounded-lg px-2 py-1.5"
                        >
                          <span className="text-[13px] text-foreground/85">
                            {item.label}
                          </span>
                          <Keys keys={item.keys} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
