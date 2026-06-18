"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, Sparkles, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAskUltrametrics } from "@/components/os/use-ask-ultrametrics";

const SUGGESTIONS = [
  { label: "Why did my ROAS drop?", icon: TrendingUp, href: "/dashboard/connectors/meta" },
  { label: "Sync all sources now", icon: RefreshCw, action: "sync" },
  { label: "Show top campaigns", icon: Zap, href: "/dashboard/connectors/meta" },
  { label: "Optimize Meta budget", icon: Sparkles, href: "/dashboard/connectors/meta" },
];

export function AskInput() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { messages, streaming, error, send } = useAskUltrametrics();

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    void send(trimmed);
    setValue("");
  }

  async function handleSync() {
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

  function handleSuggestion(s: typeof SUGGESTIONS[number]) {
    if (s.action === "sync") {
      handleSync();
    } else if (s.href) {
      router.push(s.href);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        {/* Input wrapper with animated glow border */}
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0 blur-sm"
            animate={{ opacity: focused ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "linear-gradient(135deg, hsl(221 83% 60% / 0.35), hsl(280 65% 60% / 0.2), hsl(221 83% 60% / 0.15))",
            }}
          />
          <div
            className={cn(
              "relative rounded-2xl p-px transition-all duration-300",
              focused
                ? "bg-gradient-to-r from-brand/35 via-brand/15 to-violet-500/20"
                : "bg-white/[0.07]"
            )}
          >
            <div className="flex items-center gap-3 rounded-[calc(1rem-1px)] bg-[hsl(var(--card))] px-5 py-4">
              <Sparkles
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors duration-300",
                  focused ? "text-brand" : "text-white/25"
                )}
              />
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Ask Ultrametrics about your campaigns..."
                className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-white/22"
              />
              <AnimatePresence>
                {value.trim() && (
                  <motion.button
                    type="submit"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/90 text-white transition-colors hover:bg-brand"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
              {!value.trim() && (
                <kbd className="hidden shrink-0 rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-white/20 sm:block">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Suggestion chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s)}
              disabled={s.action === "sync" && syncing}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[12px] text-white/40 transition-all hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/70 disabled:opacity-40"
            >
              <Icon className={cn("h-3 w-3", s.action === "sync" && syncing && "animate-spin")} />
              {s.action === "sync" && syncing ? "Syncing…" : s.label}
            </button>
          );
        })}
      </div>

      {/* Conversation panel — streamed Ask Ultrametrics responses */}
      {(messages.length > 0 || error) && (
        <div className="mt-4 space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          {messages.map((m, i) => (
            <div key={i} className="text-[13px] leading-relaxed">
              <span
                className={cn(
                  "mr-2 font-medium",
                  m.role === "user" ? "text-white/45" : "text-brand"
                )}
              >
                {m.role === "user" ? "You" : "Ultrametrics"}
              </span>
              <span className="whitespace-pre-wrap text-white/70">
                {m.content}
                {streaming &&
                  m.role === "assistant" &&
                  i === messages.length - 1 && (
                    <span className="ml-0.5 animate-pulse">▋</span>
                  )}
              </span>
            </div>
          ))}
          {error && (
            <div className="text-[12px] text-red-400/80">
              Couldn&apos;t complete that request: {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
