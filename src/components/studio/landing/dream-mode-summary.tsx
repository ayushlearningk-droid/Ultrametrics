"use client";

/**
 * AI Studio Home — Dream Mode overnight summary (Sprint 63N).
 *
 * A calm "while you were away" recap: what the AI completed, learned, and
 * recommends. Presentation only — deterministic sample content, no backend.
 */

import { Moon, CheckCircle2, Sparkles, Lightbulb } from "lucide-react";

const ROWS = [
  { icon: CheckCircle2, label: "Completed", value: "3 assets generated · 1 published (+18% CTR)" },
  { icon: Sparkles, label: "Learned", value: "2 winning patterns added to your brand memory" },
  { icon: Lightbulb, label: "Recommends", value: "Refresh the fatiguing 'Spring Sale' hook" },
];

export function DreamModeSummary() {
  return (
    <div className="studio-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Moon className="h-4 w-4 text-brand" />
        <h3 className="type-eyebrow text-foreground-muted">Dream Mode · While you were away</h3>
      </div>
      <div className="flex flex-col gap-2.5">
        {ROWS.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2.5">
            <div className="studio-tile flex h-7 w-7 shrink-0 items-center justify-center text-foreground-muted">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="type-caption font-semibold text-foreground">{label}</p>
              <p className="type-caption text-foreground-muted">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
