"use client";

/**
 * AI Insight Cards — reusable kit (Sprint 36).
 *
 * Token-only, additive presentation primitives + section cards for the premium
 * AI response experience. They render the structured outputs of the existing
 * reasoning + creative engines (ReasoningResult / CreativeStrategy /
 * CreativeBrief). No new design language — reuses .card / .chip / type-* and
 * motion.ts. Each card is self-contained and hides when its data is empty.
 */

import { useState } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/ai/reasoning/types";
import type {
  ReasoningResult,
  PrioritizedAction,
  BusinessImpact,
} from "@/lib/ai/reasoning/types";
import type { CreativeStrategy, CreativeBrief } from "@/lib/ai/creative/types";

/* ── Primitives ─────────────────────────────────────────────────────────── */

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-brand" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

export function ConfidenceBadge({ level }: { level: Confidence }) {
  return (
    <span className={cn("chip", level === "high" ? "chip-emerald" : "chip-slate")}>
      {level} confidence
    </span>
  );
}

/** A titled, collapsible section card with optional copy of its own text. */
export function CollapsibleSection({
  title,
  copyText,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  copyText?: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 text-left type-eyebrow text-foreground-muted transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              collapsed && "-rotate-90"
            )}
          />
          <span className="truncate">{title}</span>
        </button>
        {copyText && <CopyButton text={copyText} />}
      </div>
      {!collapsed && <div className="px-4 py-3">{children}</div>}
    </section>
  );
}

/* ── Reasoning section cards ────────────────────────────────────────────── */

export function ExecutiveSummaryCard({ text }: { text: string }) {
  return <p className="type-body leading-relaxed text-foreground/90">{text}</p>;
}

export function DiagnosisCard({ text }: { text: string }) {
  return (
    <p className="type-body font-semibold text-foreground">{text}</p>
  );
}

export function EvidenceCard({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((e, i) => (
        <li key={i} className="type-caption tabular-nums text-foreground/90">
          {e}
        </li>
      ))}
    </ul>
  );
}

export function BusinessImpactCard({ impact }: { impact: BusinessImpact }) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn(
          "type-body",
          impact.quantified ? "font-semibold text-brand" : "text-foreground-muted"
        )}
      >
        {impact.summary}
      </p>
      {impact.assumptions.length > 0 && (
        <p className="type-caption text-foreground-muted">
          Assumes: {impact.assumptions.join("; ")}
        </p>
      )}
    </div>
  );
}

export function BulletListCard({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((x, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground-muted" />
          <span className="type-body text-foreground/90">{x}</span>
        </li>
      ))}
    </ul>
  );
}

export function PrioritizedActionsCard({
  actions,
}: {
  actions: PrioritizedAction[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {actions.map((a, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="type-caption tabular-nums text-foreground-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="type-body text-foreground/90">{a.action}</span>
          </span>
          <span
            className={cn(
              "chip shrink-0",
              a.priority === "High" ? "chip-emerald" : "chip-slate"
            )}
          >
            {a.priority}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Creative section cards ─────────────────────────────────────────────── */

export function CreativeStrategyCard({ strategy }: { strategy: CreativeStrategy }) {
  return (
    <div className="flex flex-col gap-3">
      {strategy.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {strategy.actions.map((a) => (
            <span key={a} className="chip chip-slate">
              {a}
            </span>
          ))}
        </div>
      )}
      {strategy.angles.length > 0 && (
        <p className="type-caption text-foreground-muted">
          Angles: {strategy.angles.join(" · ")}
        </p>
      )}
      <p className="type-caption text-foreground/80">{strategy.testRecommendation}</p>
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="type-caption text-foreground-muted">{label}</span>
      <span className="type-body text-foreground/90">{value}</span>
    </div>
  );
}

export function CreativeBriefCard({ brief }: { brief: CreativeBrief }) {
  return (
    <div className="flex flex-col gap-3">
      <BriefRow label="Executive goal" value={brief.executiveGoal} />
      <BriefRow label="Problem" value={brief.problem} />
      {brief.evidence.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="type-caption text-foreground-muted">Evidence</span>
          <EvidenceCard items={brief.evidence} />
        </div>
      )}
      <BriefRow label="Target audience" value={brief.targetAudience} />
      {brief.hookIdeas.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="type-caption text-foreground-muted">Hook ideas</span>
          <BulletListCard items={brief.hookIdeas} />
        </div>
      )}
      <BriefRow label="Creative direction" value={brief.creativeDirection} />
      {brief.sceneSuggestions.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="type-caption text-foreground-muted">Scene suggestions</span>
          <BulletListCard items={brief.sceneSuggestions} />
        </div>
      )}
      <BriefRow label="Script direction" value={brief.scriptDirection} />
      <BriefRow label="CTA" value={brief.cta} />
      <BriefRow label="Success metric" value={brief.successMetric} />
    </div>
  );
}

/** Re-export for convenience when a consumer only needs the result type. */
export type { ReasoningResult };
