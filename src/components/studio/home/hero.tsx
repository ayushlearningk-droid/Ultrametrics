"use client";

/**
 * AI Studio Home — Hero AI Workspace (Sprint 63 · Home).
 *
 * The largest, calmest prompt surface. Reserves the future Prompt Workspace +
 * provider/brand selectors + Generate. SCOPE: shell/presentation only — the
 * field is INERT, Generate is a disabled placeholder, selectors are inert. No
 * generation, no providers, no business logic.
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Paperclip, ChevronDown, ArrowUp } from "lucide-react";
import { fadeIn } from "@/lib/motion";

/** An inert selector pill (brand / provider) — reserved entry point. */
function SelectorPill({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      aria-disabled
      title="Coming soon"
      className="studio-glass studio-focusable flex cursor-default items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors hover:border-white/[0.14]"
    >
      <span className="type-caption text-foreground-muted">{label}</span>
      <span className="type-caption font-semibold text-foreground/90">{value}</span>
      <ChevronDown className="h-3 w-3 text-foreground-muted" />
    </button>
  );
}

export function StudioHero() {
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");

  return (
    <motion.div
      variants={fadeIn}
      initial={reduce ? false : "hidden"}
      animate="visible"
      className="studio-hero relative flex min-h-[58vh] flex-col justify-center overflow-hidden p-8 md:min-h-[64vh] md:p-16"
    >
      {/* Ambient brand wash (token-based) */}
      <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(120% 100% at 50% 0%, black, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 type-eyebrow text-foreground-muted">
            <Sparkles className="h-4 w-4 text-brand" />
            AI Workspace
          </span>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            What do you want
            <br />
            to create today?
          </h1>
          <p className="max-w-xl type-body text-foreground-muted md:text-lg">
            One prompt. Your entire creative team — directing video, image, and
            campaigns from a single line.
          </p>
        </div>

        {/* Prompt workspace (inert placeholder this sprint) */}
        <div className="studio-glass p-4 md:p-5">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly
            rows={4}
            aria-label="Describe what you want to create"
            placeholder="Describe a campaign, an ad, a video — or paste a product link…"
            className="w-full resize-none cursor-default bg-transparent px-2 py-1 text-lg leading-relaxed text-foreground outline-none placeholder:text-foreground-muted"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-disabled
                title="Coming soon"
                className="studio-glass studio-focusable flex cursor-default items-center gap-1.5 px-2.5 py-1.5 text-foreground-muted transition-colors hover:border-white/[0.14]"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span className="type-caption">Attach</span>
              </button>
              <SelectorPill label="Brand" value="Default" />
              <SelectorPill label="Provider" value="Auto" />
            </div>

            <button
              type="button"
              disabled
              aria-label="Generate (coming soon)"
              title="Coming soon"
              className="flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-brand/20 px-4 py-2 text-brand opacity-60"
            >
              <span className="type-body font-semibold">Generate</span>
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
