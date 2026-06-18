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
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l border-white/[0.08] bg-[hsl(var(--card))] shadow-2xl md:w-[560px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            role="dialog"
            aria-label="Ask Ultrametrics"
          >
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
              <span className="type-body font-semibold tracking-tight">
                Ask Ultra<span className="text-brand">metrics</span>
              </span>
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
              className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
            >
              {messages.length === 0 && !error && (
                <p className="mt-8 text-center text-[13px] text-foreground-muted">
                  Ask about your campaigns, spend, or performance.
                </p>
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
