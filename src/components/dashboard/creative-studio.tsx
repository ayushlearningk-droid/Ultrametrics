"use client";

/**
 * Creative Studio 3.0 (Sprint 51) — premium AI creative workspace.
 *
 * A media-workspace SHELL (header · search · animated tabs · filters · gallery ·
 * preview drawer · skeleton · empty state) over the SAME grounded creative
 * engine output (signals · strategy · brief · hooks · copy · storyboard). No
 * media is fabricated — the studio is a planning layer, so the "gallery" is the
 * real generated assets (hooks, scripts, variants, storyboard) plus the creative
 * template frameworks. Presentation only — no engine/page/data changes.
 *
 * Design system: surface-ai/card-hover/shadow-floating + theme tokens. Motion:
 * motion.ts (fadeIn/slideUp/staggerChildren) + a reduced-motion-safe tab
 * underline. Fully dark/light via tokens.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Search,
  X,
  Star,
  Copy as CopyIcon,
  ArrowRight,
} from "lucide-react";
import {
  staggerChildren,
  slideUp,
  fadeIn,
  DUR,
  EASE_OUT,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ConfidenceBadge,
  CopyButton,
} from "@/components/os/ai/insight-cards";
import type {
  CreativeSignals,
  CreativeStrategy,
  CreativeBrief,
  HookGroup,
  CopySet,
  Storyboard,
} from "@/lib/ai/creative/types";

type AssetType = "Hook" | "Script" | "Variant" | "Storyboard" | "Template";

interface StudioAsset {
  id: string;
  type: AssetType;
  title: string;
  meta: string;
  body: string;
  copyText: string;
}

const TABS: (AssetType | "All")[] = [
  "All",
  "Hook",
  "Script",
  "Variant",
  "Storyboard",
  "Template",
];

const TAB_LABEL: Record<string, string> = {
  All: "All",
  Hook: "Hooks",
  Script: "Scripts",
  Variant: "Variants",
  Storyboard: "Storyboard",
  Template: "Templates",
};

/** Creative template frameworks — method names (not fabricated data). */
const TEMPLATES: { name: string; description: string }[] = [
  { name: "UGC", description: "Authentic user-generated style testimonial." },
  { name: "Product Demo", description: "Show the product solving the problem." },
  { name: "Founder Story", description: "Personal, mission-led narrative." },
  { name: "Problem / Solution", description: "Agitate the pain, present the fix." },
  { name: "Offer", description: "Lead with the deal and urgency." },
  { name: "Festival", description: "Seasonal / event-tied creative angle." },
  { name: "Review", description: "Social-proof led, rating-forward." },
  { name: "Launch", description: "New drop / announcement framing." },
];

function buildAssets(
  hooks: HookGroup[],
  copy: CopySet,
  storyboard: Storyboard
): StudioAsset[] {
  const assets: StudioAsset[] = [];

  hooks.forEach((g, gi) =>
    g.hooks.forEach((h, hi) =>
      assets.push({
        id: `hook-${gi}-${hi}`,
        type: "Hook",
        title: h,
        meta: g.category,
        body: h,
        copyText: h,
      })
    )
  );

  copy.headlines.forEach((h, i) =>
    assets.push({ id: `headline-${i}`, type: "Script", title: h, meta: "Headline", body: h, copyText: h })
  );
  copy.primaryText.forEach((p, i) =>
    assets.push({ id: `primary-${i}`, type: "Script", title: p, meta: "Primary text", body: p, copyText: p })
  );
  copy.captions.forEach((c, i) =>
    assets.push({ id: `caption-${i}`, type: "Script", title: c, meta: "Caption", body: c, copyText: c })
  );

  copy.variants.forEach((v) =>
    assets.push({
      id: `variant-${v.label}`,
      type: "Variant",
      title: `Variant ${v.label}`,
      meta: v.angle,
      body: `${v.headline}\n\n${v.primaryText}\n\nCTA: ${v.cta}`,
      copyText: `${v.headline}\n${v.primaryText}\nCTA: ${v.cta}`,
    })
  );

  storyboard.scenes.forEach((s, i) =>
    assets.push({
      id: `scene-${i}`,
      type: "Storyboard",
      title: s.label,
      meta: "Scene",
      body: s.direction,
      copyText: `${s.label}: ${s.direction}`,
    })
  );
  assets.push({
    id: "scene-ending",
    type: "Storyboard",
    title: "Ending",
    meta: "Scene",
    body: storyboard.ending,
    copyText: `Ending: ${storyboard.ending}`,
  });

  TEMPLATES.forEach((t, i) =>
    assets.push({
      id: `template-${i}`,
      type: "Template",
      title: t.name,
      meta: "Framework",
      body: t.description,
      copyText: `${t.name} — ${t.description}`,
    })
  );

  return assets;
}

export function CreativeStudio({
  signals,
  strategy,
  brief,
  hooks,
  copy,
  storyboard,
}: {
  signals: CreativeSignals;
  strategy: CreativeStrategy;
  brief: CreativeBrief;
  hooks: HookGroup[];
  copy: CopySet;
  storyboard: Storyboard;
}) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<AssetType | "All">("All");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<StudioAsset | null>(null);
  // Mounted gate drives the one-time skeleton (no backend fetch exists).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const assets = useMemo(
    () => buildAssets(hooks, copy, storyboard),
    [hooks, copy, storyboard]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (tab !== "All" && a.type !== tab) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.meta.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
      );
    });
  }, [assets, tab, query]);

  // Escape closes preview; lock scroll while open.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  const toggleFav = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const briefText = [
    `Executive goal: ${brief.executiveGoal}`,
    `Problem: ${brief.problem}`,
    `Direction: ${brief.creativeDirection}`,
    `CTA: ${brief.cta}`,
    `Success metric: ${brief.successMetric}`,
  ].join("\n");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      {/* Header */}
      <motion.header
        variants={fadeIn}
        initial={reduce ? false : "hidden"}
        animate="visible"
        className="surface-ai shadow-floating flex flex-col gap-4 p-6 md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 type-eyebrow text-foreground-muted">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Creative Studio
            </span>
            <h1 className="type-display text-foreground">{brief.executiveGoal}</h1>
            <p className="type-body max-w-2xl text-foreground-muted">
              Grounded creative direction from your performance diagnosis. Planning
              layer — no images or videos are generated.
            </p>
          </div>
          <ConfidenceBadge level={brief.confidence} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-emerald tabular-nums">{assets.length} assets</span>
          <span className="chip chip-slate">Hook quality · {signals.hookQuality}</span>
          {strategy.angles[0] && (
            <span className="chip chip-slate">{strategy.angles[0]}</span>
          )}
        </div>

        {/* Search */}
        <div className="card flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hooks, scripts, variants…"
            aria-label="Search creative assets"
            className="flex-1 bg-transparent type-body text-foreground outline-none placeholder:text-foreground-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="rounded-md p-1 text-foreground-muted transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tabs with animated underline */}
        <div
          role="tablist"
          aria-label="Asset types"
          className="flex flex-wrap items-center gap-1"
        >
          {TABS.map((t) => {
            const activeTab = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={activeTab}
                onClick={() => setTab(t)}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 type-caption font-semibold transition-colors",
                  activeTab ? "text-brand" : "text-foreground-muted hover:text-foreground"
                )}
              >
                {TAB_LABEL[t]}
                {activeTab && (
                  <motion.span
                    layoutId="cs-tab-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                    transition={reduce ? { duration: 0 } : { duration: DUR.base, ease: EASE_OUT }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.header>

      {/* Gallery / loading / empty */}
      {!ready ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.slice(0, 6).map((a) => (
            <AssetSkeleton key={a.id} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-[hsl(var(--card-fill))]">
            <Sparkles className="h-5 w-5 text-foreground-muted" />
          </div>
          <p className="type-body font-semibold text-foreground">No assets match</p>
          <p className="max-w-sm type-caption text-foreground-muted">
            Try a different search term or switch tabs.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerChildren}
          initial={reduce ? false : "hidden"}
          animate="visible"
        >
          {filtered.map((a) => (
            <motion.div
              key={a.id}
              variants={slideUp}
              className="group card card-hover card-interactive flex flex-col gap-2 p-4"
              onClick={() => setActive(a)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="type-caption font-semibold text-brand">{a.type}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(a.id);
                  }}
                  aria-label={favorites.has(a.id) ? "Remove favorite" : "Add favorite"}
                  aria-pressed={favorites.has(a.id)}
                  className="rounded-md p-1 text-foreground-muted transition-colors hover:text-brand"
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      favorites.has(a.id) && "fill-brand text-brand"
                    )}
                  />
                </button>
              </div>
              <p className="line-clamp-3 type-body font-semibold text-foreground">
                {a.title}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="chip chip-slate">{a.meta}</span>
                <span className="inline-flex items-center gap-1 type-caption font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                  Open
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Creative Pack — real copy bundle (unchanged behaviour) */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
        <Sparkles className="h-4 w-4 text-brand" />
        <span className="type-caption text-foreground-muted">Creative Pack —</span>
        <CopyButton text={briefText} label="Brief" />
        <CopyButton
          text={hooks.map((g) => `${g.category}\n${g.hooks.map((h) => `- ${h}`).join("\n")}`).join("\n\n")}
          label="Hooks"
        />
        <CopyButton text={copy.headlines.join("\n")} label="Headlines" />
        <CopyButton text={copy.captions.join("\n")} label="Captions" />
      </div>

      <PreviewDrawer
        asset={active}
        favorite={active ? favorites.has(active.id) : false}
        onToggleFav={() => active && toggleFav(active.id)}
        onClose={() => setActive(null)}
        reduce={reduce}
      />
    </div>
  );
}

function AssetSkeleton() {
  return (
    <div className="card flex h-32 flex-col gap-2 p-4">
      <div className="skeleton h-3 w-16" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-2/3" />
      <div className="mt-auto skeleton h-5 w-20 rounded-full" />
    </div>
  );
}

function PreviewDrawer({
  asset,
  favorite,
  onToggleFav,
  onClose,
  reduce,
}: {
  asset: StudioAsset | null;
  favorite: boolean;
  onToggleFav: () => void;
  onClose: () => void;
  reduce: boolean | null;
}) {
  return (
    <AnimatePresence>
      {asset && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            variants={fadeIn}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-y-auto border-l border-border bg-[hsl(var(--card))] shadow-2xl sm:w-[460px]"
            initial={reduce ? false : { x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            role="dialog"
            aria-label={`${asset.title} preview`}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border px-6 py-4">
              <div className="flex flex-col gap-1">
                <span className="type-eyebrow text-foreground-muted">
                  {asset.type} · {asset.meta}
                </span>
                <h2 className="type-body font-semibold text-foreground">{asset.title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-[hsl(var(--card-fill-strong))] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 px-6 py-5">
              {/* Large preview surface (text asset — no media exists) */}
              <div className="surface-floating shadow-floating flex min-h-[140px] items-center justify-center rounded-2xl p-6">
                <p className="whitespace-pre-wrap text-center type-body leading-relaxed text-foreground/90">
                  {asset.body}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="type-eyebrow text-foreground-muted">Details</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip chip-slate">{asset.type}</span>
                  <span className="chip chip-slate">{asset.meta}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border px-6 py-4">
              <CopyButton text={asset.copyText} label="Copy" />
              <button
                type="button"
                onClick={onToggleFav}
                aria-pressed={favorite}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground"
              >
                <Star className={cn("h-3.5 w-3.5", favorite && "fill-brand text-brand")} />
                {favorite ? "Favorited" : "Favorite"}
              </button>
              <span className="ml-auto inline-flex items-center gap-1.5 type-caption text-foreground-muted">
                <CopyIcon className="h-3 w-3" />
                Plan-only
              </span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
