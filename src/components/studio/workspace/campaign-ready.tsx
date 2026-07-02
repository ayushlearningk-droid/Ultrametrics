"use client";

/**
 * Campaign Ready (Sprint 64AZ) — the completion moment.
 *
 * A full-width summary shown when the campaign finishes: what was produced
 * (images · headlines · captions · campaign · export readiness), a "Campaign
 * Complete · 100%" headline, and a clear action ladder (Export → Generate
 * Variations → Start New Campaign). Every number is derived from the Generation
 * Store — presentation only. Subtle Apple-style success motion (a gentle
 * fade/rise + a breathing check), no confetti.
 */

import { useEffect, useState } from "react";
import { Check, Upload, Sparkles, Plus, Image as ImageIcon, Type, MessageSquare, Megaphone, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeneration, clearGeneration } from "@/components/studio/generation/generation-store";
import { executeGeneration } from "@/components/studio/generation/executor";
import { openExport } from "@/components/studio/generation/export-store";

function Stat({ icon: Icon, label, value }: { icon: typeof Check; label: string; value: string }) {
  return (
    <div className="studio-card flex items-center gap-2.5 p-3">
      <div className="studio-tile flex h-8 w-8 shrink-0 items-center justify-center text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="type-body font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate type-caption text-foreground-muted">{label}</p>
      </div>
    </div>
  );
}

export function CampaignReady() {
  const gen = useGeneration();
  const [shown, setShown] = useState(false);

  const done = gen?.execution.status === "completed";
  useEffect(() => {
    if (!done) {
      setShown(false);
      return;
    }
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [done]);

  if (!gen || !done) return null;

  const images = gen.creatives.filter((c) => c.media.kind !== "video" && c.execution?.status === "completed").length;
  const headlines = gen.creativePlan.headlines.length;
  const captions = gen.creativePlan.descriptions.length + gen.creativePlan.primaryText.length;
  const exportReady = gen.creatives.some((c) => c.execution?.status === "completed" && !!c.execution.mediaUrl);

  return (
    <section
      className={cn(
        "studio-card relative overflow-hidden p-6 transition-all duration-700 md:p-8",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className={cn("studio-breathe flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[hsl(var(--brand-foreground))]")}>
            <Check className="h-5 w-5" />
          </span>
          <div>
            <p className="type-eyebrow text-foreground-muted">Campaign Complete · 100%</p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Your campaign is ready.</h2>
          </div>
        </div>

        {/* What was produced */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat icon={ImageIcon} label="Images generated" value={`${images}`} />
          <Stat icon={Type} label="Headlines" value={`${headlines}`} />
          <Stat icon={MessageSquare} label="Captions" value={`${captions}`} />
          <Stat icon={Megaphone} label="Campaign" value={gen.campaignPlan.platforms.length === 1 ? "1 placement" : `${gen.campaignPlan.platforms.length} placements`} />
          <Stat icon={PackageCheck} label="Export readiness" value={exportReady ? "Ready" : "Pending"} />
        </div>

        {/* Action ladder */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openExport()}
            className="studio-focusable inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-brand px-5 py-2.5 type-body font-semibold text-[hsl(var(--brand-foreground))] transition-transform hover:scale-[1.01] active:scale-100"
          >
            <Upload className="h-4 w-4" /> Export Campaign
          </button>
          <button
            type="button"
            onClick={() => void executeGeneration(gen, gen.creatives.map((c) => c.id))}
            className="studio-focusable inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] border border-white/[0.1] px-4 py-2.5 type-caption font-semibold text-foreground transition-colors hover:bg-white/[0.05]"
          >
            <Sparkles className="h-4 w-4 text-brand" /> Generate Variations
          </button>
          <button
            type="button"
            onClick={() => clearGeneration()}
            className="studio-focusable inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] px-4 py-2.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Start New Campaign
          </button>
        </div>
      </div>
    </section>
  );
}
