"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAsk } from "@/components/os/ask-provider";

export function BottomCommandBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { send, open } = useAsk();

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    void send(trimmed);
    open();
    setValue("");
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await Promise.allSettled([
        fetch("/api/sync/meta-to-google-sheets", { method: "POST" }),
        fetch("/api/sync/google-ads-to-google-sheets", { method: "POST" }),
      ]);
      toast.success("Sync triggered for all active sources.");
    } catch {
      toast.error("Could not trigger sync. Check connector health.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="relative z-[2] shrink-0 px-4 pb-4 pt-2">
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-3xl">
        <div
          className={cn(
            "surface-elevated flex items-center gap-3 px-4 py-3 transition-all duration-200",
            focused && "cmd-bloom"
          )}
        >
          <Sparkles
            className={cn(
              "h-[17px] w-[17px] shrink-0 transition-colors duration-200",
              focused ? "text-brand" : "text-foreground-muted"
            )}
          />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask Ultrametrics about your campaigns…"
            className="flex-1 bg-transparent type-body text-foreground outline-none placeholder:text-foreground-muted"
          />

          <div className="flex shrink-0 items-center gap-2">
            <AnimatePresence>
              {syncing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {value.trim() ? (
                <motion.button
                  key="submit"
                  type="submit"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-[0_0_12px_0] shadow-brand/40 hover:bg-brand/90"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.button>
              ) : (
                <motion.div
                  key="hints"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="hidden items-center gap-2 sm:flex"
                >
                  <button
                    type="button"
                    onClick={triggerSync}
                    disabled={syncing}
                    className="type-caption font-medium text-foreground-muted transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    {syncing ? "Syncing…" : "Sync all"}
                  </button>
                  <span className="text-foreground-muted/40">·</span>
                  <kbd className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
                    ⌘K
                  </kbd>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </form>
    </div>
  );
}
