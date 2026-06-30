"use client";

/**
 * Inspiration Engine — library (Sprint 63.2).
 *
 * A reusable inspiration library for the AI Studio Home, grouped by category.
 * Every card shows a thumbnail, outcome, category, industry, estimated quality
 * and recommended AI team. Clicking a card populates the outcome prompt (via the
 * onSelect callback) — it never generates; the user still approves generation.
 * Reuses the media CreativeThumbnail, the Outcome Engine, and the Employees
 * registry. Presentation only, deterministic.
 */

import { Sparkles, Gauge, Building2 } from "lucide-react";
import { CreativeThumbnail } from "@/components/studio/media";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import { StudioSection } from "./primitives";
import {
  INSPIRATION_CATEGORIES,
  inspirationByCategory,
  type InspirationCard,
} from "./inspiration-data";

function Card({ card, onSelect }: { card: InspirationCard; onSelect: (card: InspirationCard) => void }) {
  const outcome = outcomeById(card.outcomeId);
  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      title="Use this inspiration"
      className="studio-card studio-card-interactive studio-focusable flex w-[260px] shrink-0 flex-col overflow-hidden text-left"
    >
      <CreativeThumbnail media={card.thumbnail} aspect="video" />
      <div className="flex flex-col gap-2 p-3">
        <p className="truncate type-body font-semibold text-foreground">{card.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {outcome && <span className="chip chip-emerald">{outcome.label}</span>}
          <span className="chip chip-slate">{card.category}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {card.industry}
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3 w-3" /> {card.quality} quality
          </span>
        </div>
        <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-2">
          <span className="type-caption text-foreground-muted">Team</span>
          <span className="flex items-center gap-1">
            {card.team.map((id) => {
              const Icon = EMPLOYEE_ICON[id];
              return (
                <span key={id} title={employeeName(id)} className="studio-tile flex h-6 w-6 items-center justify-center text-foreground-muted">
                  <Icon className="h-3 w-3" />
                </span>
              );
            })}
          </span>
        </div>
      </div>
    </button>
  );
}

export function InspirationLibrary({ onSelect }: { onSelect: (card: InspirationCard) => void }) {
  return (
    <StudioSection label="Inspiration" description="Pick an inspiration — it fills the outcome prompt. You still approve generation.">
      <div className="flex flex-col gap-6">
        {INSPIRATION_CATEGORIES.map((category) => {
          const cards = inspirationByCategory(category);
          if (cards.length === 0) return null;
          return (
            <section key={category} className="flex flex-col gap-3">
              <h3 className="flex items-center gap-1.5 type-caption font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                {category}
              </h3>
              <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
                {cards.map((c) => (
                  <Card key={c.id} card={c} onSelect={onSelect} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </StudioSection>
  );
}
