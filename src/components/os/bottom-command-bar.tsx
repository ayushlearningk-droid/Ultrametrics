"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KEYWORD_ROUTES: [RegExp, string][] = [
  [/meta|facebook|roas|ctr|spend|creative/i, "/dashboard/connectors/meta"],
  [/google ads|gads|campaign|keyword/i, "/dashboard/connectors/google-ads"],
  [/sync|job|history|pipeline/i, "/dashboard/sync-jobs"],
  [/connect|source|integration/i, "/dashboard/connectors"],
  [/setting|billing|plan/i, "/dashboard/settings"],
];

export function BottomCommandBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [syncing, setSyncing] = useState(false);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    const match = KEYWORD_ROUTES.find(([re]) => re.test(trimmed));
    if (match) {
      router.push(match[1]);
    } else {
      toast("AI responses are coming soon.", {
        description: "Use ⌘K to navigate and take actions now.",
        action: {
          label: "Open ⌘K",
          onClick: () =>
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                ctrlKey: true,
                bubbles: true,
              })
            ),
        },
      });
    }
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
    <div className="shrink-0 border-t border-white/[0.06] bg-[hsl(var(--background)/0.97)] px-4 py-3 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="relative">
        {/* Glow backdrop on focus */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 blur-md"
          animate={{ opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, hsl(221 83% 60% / 0.18), transparent 70%)",
          }}
        />

        <div
          className={cn(
            "relative rounded-xl p-px transition-colors duration-200",
            focused ? "bg-brand/25" : "bg-white/[0.07]"
          )}
        >
          <div className="flex items-center gap-3 rounded-[calc(0.75rem-1px)] bg-[hsl(var(--background))] px-4 py-2.5">
            <Sparkles
              className={cn(
                "h-[15px] w-[15px] shrink-0 transition-colors duration-200",
                focused ? "text-brand" : "text-white/20"
              )}
            />
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask Ultrametrics about your campaigns…"
              className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-white/20"
            />

            <div className="flex shrink-0 items-center gap-1.5">
              <AnimatePresence>
                {syncing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.12 }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-white/30" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {value.trim() ? (
                  <motion.button
                    key="submit"
                    type="submit"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.12 }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/90 text-white hover:bg-brand"
                  >
                    <ArrowRight className="h-3 w-3" />
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
                      className="text-[10px] font-medium text-white/20 transition-colors hover:text-white/50 disabled:opacity-40"
                    >
                      {syncing ? "Syncing…" : "Sync all"}
                    </button>
                    <span className="text-white/10">·</span>
                    <kbd className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-white/18">
                      ⌘K
                    </kbd>
                    <kbd className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-white/18">
                      ↵
                    </kbd>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
