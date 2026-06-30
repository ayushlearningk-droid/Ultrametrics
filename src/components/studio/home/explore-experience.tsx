"use client";

/**
 * Explore experience (Sprint 63.6).
 *
 * A premium browsing surface beside Home — large autoplay-style preview cards
 * (deterministic placeholders), category rows with infinite horizontal browsing,
 * search, filters and hover preview. Reuses the Inspiration Library data and the
 * media primitives. Clicking a card ONLY prefills the outcome prompt + brand (via
 * onSelect); the user still explicitly starts generation. Presentation only — no
 * backend, no autoplay video, no fake AI.
 */

import { useMemo, useState } from "react";
import { Search, Play, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreativeThumbnail } from "@/components/studio/media";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import {
  INSPIRATION,
  INSPIRATION_CATEGORIES,
  type InspirationCard,
  type InspirationCategory,
} from "./inspiration-data";

type Filter = "All" | InspirationCategory;

/** Repeat a row's cards to give an endless horizontal browse. Deterministic. */
function endless(cards: InspirationCard[]): InspirationCard[] {
  if (cards.length === 0) return cards;
  return [...cards, ...cards, ...cards];
}

function ExploreCard({ card, onSelect }: { card: InspirationCard; onSelect: (card: InspirationCard) => void }) {
  const outcome = outcomeById(card.outcomeId);
  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      title="Use this — prefills the outcome prompt"
      className="group studio-card studio-card-interactive studio-focusable relative w-[320px] shrink-0 overflow-hidden text-left"
    >
      <div className="aspect-video">
        <CreativeThumbnail media={card.thumbnail} aspect="video" />
      </div>

      {/* Autoplay-style affordance (deterministic placeholder, reveals on hover). */}
      <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <Play className="h-3.5 w-3.5" />
      </span>

      {/* Hover preview overlay. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 opacity-90 transition-opacity">
        <p className="truncate type-body font-semibold text-white">{card.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {outcome && <span className="chip chip-emerald">{outcome.label}</span>}
          <span className="chip chip-slate">{card.industry}</span>
        </div>
      </div>
    </button>
  );
}

export function ExploreExperience({ onSelect }: { onSelect: (card: InspirationCard) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INSPIRATION.filter((c) => {
      const inFilter = filter === "All" || c.category === filter;
      const inQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);
      return inFilter && inQuery;
    });
  }, [query, filter]);

  const categories: InspirationCategory[] =
    filter === "All" ? INSPIRATION_CATEGORIES : [filter];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Compass className="h-3.5 w-3.5 text-brand" />
          Explore
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">A wall of winning ideas</h2>
        <p className="max-w-xl type-body text-foreground-muted">
          Browse, then pick one — it prefills your outcome prompt. You still start generation.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="studio-glass flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inspiration — title, industry, category…"
            aria-label="Search inspiration"
            className="w-full bg-transparent type-caption text-foreground outline-none placeholder:text-foreground-muted"
          />
        </div>
        <div className="studio-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(["All", ...INSPIRATION_CATEGORIES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "studio-focusable shrink-0 rounded-full px-3 py-1.5 type-caption transition-colors",
                filter === f ? "bg-brand/15 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Category rows with infinite horizontal browse */}
      {matches.length === 0 ? (
        <div className="studio-card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="type-body font-semibold text-foreground">No inspiration found</p>
          <p className="type-caption text-foreground-muted">Try a different search or filter.</p>
        </div>
      ) : (
        categories.map((category) => {
          const cards = matches.filter((c) => c.category === category);
          if (cards.length === 0) return null;
          return (
            <section key={category} className="flex flex-col gap-3">
              <h3 className="type-caption font-semibold text-foreground">{category}</h3>
              <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
                {endless(cards).map((c, i) => (
                  <ExploreCard key={`${c.id}-${i}`} card={c} onSelect={onSelect} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
