"use client";

/**
 * Ask Ultrametrics — AI drawer (V2, Step 4).
 *
 * Right-side slide-over that reads the SHARED conversation from useAsk() and
 * renders each turn with ChatMessage. 480px on desktop, full-width on mobile,
 * animated with Framer Motion. The launcher (bottom command bar) drives sending
 * and opening — this drawer is the reading surface only (no input here).
 */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useAsk } from "@/components/os/ask-provider";
import { ChatMessage } from "@/components/os/chat-message";

export function AskDrawer() {
  const { messages, streaming, error, isOpen, close } = useAsk();

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
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l border-white/[0.08] bg-[hsl(var(--card))] shadow-2xl md:w-[480px]"
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
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
