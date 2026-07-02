"use client";

/**
 * Workspace Guide (Sprint 64AB) — the guided-workflow spine.
 *
 * A sticky stage navigator + breadcrumb + a single primary CTA that always tells
 * the user what to do next. The current stage is derived from real execution
 * state (the Generation Store). One primary action per stage — never competing
 * CTAs. The "Advanced" toggle reveals the full dockable workspace (toolbar +
 * every panel); by default only Movie → Gallery → Approval are shown.
 * Orchestration only — no backend, routing, provider, or execution change.
 */

import { FileText, Clapperboard, Images, CheckCircle2, Upload, ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { openExport } from "@/components/studio/generation/export-store";
import type { GenerationResult } from "@/components/studio/generation/generation-runtime";
import { useRegions, type RegionId, type Zone } from "./region-manager";

type StageId = "brief" | "working" | "assets" | "review" | "export";

const STAGES: { id: StageId; label: string; icon: typeof FileText }[] = [
  { id: "brief", label: "Campaign Brief", icon: FileText },
  { id: "working", label: "AI Working", icon: Clapperboard },
  { id: "assets", label: "Generated Assets", icon: Images },
  { id: "review", label: "Review", icon: CheckCircle2 },
  { id: "export", label: "Export", icon: Upload },
];

const BREADCRUMB = ["Campaign", "Generation", "Review", "Export"];
/** Which breadcrumb index a stage maps to. */
const STAGE_BREADCRUMB: Record<StageId, number> = { brief: 0, working: 1, assets: 1, review: 2, export: 3 };

/** Advanced panels revealed to their natural zones when Advanced is on. */
const ADVANCED_REGIONS: { id: RegionId; zone: Zone }[] = [
  { id: "outcome", zone: "left" },
  { id: "employees", zone: "center" },
  { id: "activity", zone: "right" },
  { id: "timeline", zone: "right" },
  { id: "inspector", zone: "right" },
  { id: "canvas", zone: "center" },
  { id: "queue", zone: "right" },
];

/** Current stage from real execution state. */
function currentStage(gen: GenerationResult | null): StageId {
  if (!gen) return "brief";
  if (gen.creatives.some((c) => c.status === "approved")) return "export";
  if (gen.execution.status === "completed") return "review";
  if (gen.execution.completedJobs > 0) return "assets";
  return "working";
}

export function WorkspaceGuide() {
  const gen = useGeneration();
  const { showRegion, setZone, advanced, setAdvanced } = useRegions();

  const stage = currentStage(gen);
  const idx = STAGES.findIndex((s) => s.id === stage);
  const bcIdx = STAGE_BREADCRUMB[stage];

  const PRIMARY: Record<StageId, { label: string; run: () => void }> = {
    brief: { label: "View Progress", run: () => showRegion("movie", "center") },
    working: { label: "View Progress", run: () => showRegion("movie", "center") },
    assets: { label: "Review Assets", run: () => showRegion("creative", "center") },
    review: { label: "Approve Campaign", run: () => showRegion("approval", "center") },
    export: { label: "Export Campaign", run: () => openExport() },
  };
  const primary = PRIMARY[stage];

  const toggleAdvanced = () => {
    const next = !advanced;
    for (const { id, zone } of ADVANCED_REGIONS) setZone(id, next ? zone : "hidden");
    setAdvanced(next);
  };

  return (
    <div className="sticky top-0 z-30 -mx-3 mb-4 flex flex-col gap-2 border-b border-white/[0.06] bg-[hsl(222_44%_5%)]/85 px-3 py-2.5 backdrop-blur md:-mx-6 md:px-6">
      {/* Breadcrumb — always visible */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 type-caption text-foreground-muted">
        {BREADCRUMB.map((b, i) => (
          <span key={b} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            <span className={cn(i === bcIdx ? "font-semibold text-brand" : i < bcIdx ? "text-foreground" : "text-foreground-muted")}>{b}</span>
          </span>
        ))}
      </nav>

      {/* Stage navigation + single primary CTA */}
      <div className="flex items-center gap-3">
        <div className="studio-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const active = i === idx;
            const done = i < idx;
            return (
              <div key={s.id} className="flex shrink-0 items-center gap-1">
                {i > 0 && <span className="h-px w-4 bg-white/10" aria-hidden />}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 type-caption transition-colors",
                    active ? "bg-brand/15 font-semibold text-brand" : done ? "text-foreground" : "text-foreground-muted"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" /> {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleAdvanced}
            aria-pressed={advanced}
            title="Show every panel"
            className={cn(
              "studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] px-2.5 py-1.5 type-caption transition-colors",
              advanced ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" /> Advanced
          </button>
          {gen && (
            <button
              type="button"
              onClick={primary.run}
              className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-md)] bg-brand px-4 py-2 type-caption font-semibold text-[hsl(var(--brand-foreground))] transition-transform hover:scale-[1.01] active:scale-100"
            >
              {primary.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
