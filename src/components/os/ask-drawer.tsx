"use client";

/**
 * Ask Ultrametrics — AI drawer (V2, Step 7).
 *
 * Right-side slide-over that reads the SHARED conversation from useAsk() and
 * renders each turn with ChatMessage. 560px on desktop, full-width on mobile,
 * animated with Framer Motion. Now also hosts its own reply input (shares the
 * same useAsk().send as the bottom command bar, so both surfaces drive one
 * conversation).
 *
 * Smart auto-scroll: only follows new content when the user is already near the
 * bottom, so reading scrollback isn't yanked mid-stream.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useAsk } from "@/components/os/ask-provider";
import { ChatMessage } from "@/components/os/chat-message";

/** Distance (px) from the bottom within which we treat the user as "at bottom". */
const NEAR_BOTTOM_PX = 80;

/** Empty-state starter chips. Each sends a metrics-grounded analytics prompt. */
const PROMPT_CHIPS: { label: string; prompt: string }[] = [
  {
    label: "Analyze ROAS",
    prompt:
      "Analyze my ROAS across all connected sources for the last 30 days. Use the metrics tools and explain what's driving it.",
  },
  {
    label: "Compare Channels",
    prompt:
      "Compare performance across my connected ad channels for the last 30 days — spend, conversions, and ROAS side by side.",
  },
  {
    label: "Top Campaigns",
    prompt:
      "Show my top-performing campaigns over the last 30 days based on the available metrics.",
  },
  {
    label: "Find Performance Issues",
    prompt:
      "Review my metrics for the last 30 days and flag any unusual changes or underperforming areas, grounded in the data.",
  },
];

export function AskDrawer() {
  const { messages, streaming, error, isOpen, close, send } = useAsk();

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Whether the user is pinned to the bottom (controls smart auto-scroll).
  const atBottomRef = useRef(true);

  // Auto-focus the input when the drawer opens (after the slide-in mounts).
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // Track whether the user is near the bottom of the scroll region.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distance <= NEAR_BOTTOM_PX;
  }, []);

  // Smart auto-scroll: only follow new content when already near the bottom.
  useEffect(() => {
    if (atBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, streaming]);

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed || streaming) return;
    void send(trimmed);
    setDraft("");
    // A fresh send means we want to follow the response.
    atBottomRef.current = true;
  }

  function sendPrompt(prompt: string) {
    if (streaming) return;
    void send(prompt);
    atBottomRef.current = true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter submits; Shift+Enter inserts a newline. Ignore during IME compose.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — click to dismiss */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-hidden
          />

          {/* Drawer panel */}
          <motion.aside
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l border-white/[0.08] bg-[hsl(var(--card))] shadow-2xl md:w-[680px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            role="dialog"
            aria-label="Ask Ultrametrics"
          >
            {/* Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-6">
              <div className="flex flex-col gap-0.5">
                <span className="type-body font-semibold tracking-tight">
                  Ask Ultra<span className="text-brand">metrics</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_0] shadow-emerald-400/60" />
                  AI Online
                </span>
              </div>
              <button
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — scrollable messages */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 space-y-6 overflow-y-auto px-6 py-6"
            >
              {messages.length === 0 && !error && (
                <div className="mt-6 space-y-4">
                  <p className="text-[13px] font-medium text-foreground/70">
                    What would you like to look into?
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PROMPT_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => sendPrompt(chip.prompt)}
                        disabled={streaming}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 text-left text-[13px] font-medium text-foreground/80 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-foreground disabled:opacity-40"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  role={m.role}
                  content={m.content}
                  streaming={
                    streaming &&
                    m.role === "assistant" &&
                    i === messages.length - 1
                  }
                />
              ))}

              {error && (
                <div className="text-[12px] text-red-400/80">
                  Couldn&apos;t complete that request: {error}
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Reply input */}
            <form
              onSubmit={handleSubmit}
              className="shrink-0 border-t border-white/[0.07] p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Reply to Ask Ultrametrics…"
                  className="max-h-32 flex-1 resize-none bg-transparent py-1 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-foreground-muted"
                />
                <button
                  type="submit"
                  disabled={streaming || !draft.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-[0_0_12px_0] shadow-brand/40 transition-colors hover:bg-brand/90 disabled:opacity-40 disabled:shadow-none"
                  aria-label="Send"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
