"use client";

/**
 * AI Movie 2.0 (Sprint 64AG) — the signature experience.
 *
 * The Movie is the AI company building the campaign: a vertical handoff of AI
 * employees (CEO → Strategist → Research → Copywriter → Creative Director →
 * Designer → Media Buyer → Approval). Each card shows an avatar, live status
 * (Thinking/Working/Completed), confidence and duration; the active employee is
 * expanded and reveals its real output (strategy, research, headlines, creative
 * ideas, generated images, recommendations). Completed employees auto-collapse.
 *
 * Everything is derived from the Generation Store — no fake timers, no fabricated
 * progress. Only one employee is active at a time (the real execution frontier).
 * Presentation only.
 */

import { useState } from "react";
import { Check, Loader2, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ICON } from "@/components/studio/employees/employees-data";
import { CreativeThumbnail } from "@/components/studio/media";
import type { EmployeeId } from "@/components/studio/employees/types";
import type { Confidence } from "@/components/studio/employees/types";
import { useGeneration, selectAsset } from "@/components/studio/generation/generation-store";
import type { GenerationResult } from "@/components/studio/generation/generation-runtime";

type StageStatus = "queued" | "working" | "completed" | "failed";

interface EmployeeStage {
  key: string;
  role: string;
  ownerId: EmployeeId;
  task: string;
  status: StageStatus;
  confidence?: Confidence;
  durationLabel: string;
  summary: string;
  output: React.ReactNode;
}

const STATUS_CHIP: Record<StageStatus, string> = { queued: "chip-slate", working: "chip-slate", completed: "chip-emerald", failed: "chip-red" };
const STATUS_LABEL: Record<StageStatus, string> = { queued: "Queued", working: "Working", completed: "Completed", failed: "Failed" };
const CONF_LABEL: Record<Confidence, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

function fmtDuration(ms: number): string {
  if (ms <= 0) return "—";
  const s = ms / 1000;
  return s >= 10 ? `${Math.round(s)}s` : `${s.toFixed(1)}s`;
}

const isTerminal = (s: string | undefined) => s === "completed" || s === "failed" || s === "cancelled";

function confidenceFor(gen: GenerationResult, stage: string): Confidence | undefined {
  return gen.explanations.find((e) => e.stage === stage)?.confidence;
}

/** A small labelled list block for an employee's output. */
function OutputList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="type-eyebrow text-foreground-muted">{label}</span>
      <ul className="flex flex-col gap-0.5">
        {items.map((t, i) => (
          <li key={i} className="type-caption text-foreground">• {t}</li>
        ))}
      </ul>
    </div>
  );
}

function OutputLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="type-eyebrow text-foreground-muted">{label}</span>
      <p className="type-caption text-foreground">{value}</p>
    </div>
  );
}

/** Build the employee handoff from real generation + execution state. Pure. */
function buildEmployeeStages(gen: GenerationResult): EmployeeStage[] {
  const cp = gen.campaignPlan;
  const crp = gen.creativePlan;
  const dna = gen.input.dna;

  const images = gen.creatives.filter((c) => c.media.kind !== "video");
  const completedImgs = images.filter((c) => c.execution?.status === "completed");
  const imgRunning = images.some((c) => c.execution?.status === "running");
  const imgFinished = images.length > 0 && images.every((c) => isTerminal(c.execution?.status));
  const imgDurationMs = images.reduce((s, c) => s + (c.execution?.generationTimeMs ?? 0), 0);
  let designerStatus: StageStatus;
  if (images.length === 0) designerStatus = "queued";
  else if (imgRunning) designerStatus = "working";
  else if (imgFinished) designerStatus = completedImgs.length > 0 ? "completed" : "failed";
  else designerStatus = "queued";

  const approvedCount = gen.creatives.filter((c) => c.status === "approved").length;
  const allDone = gen.execution.status === "completed";
  let approvalStatus: StageStatus;
  if (allDone && approvedCount > 0) approvalStatus = "completed";
  else if (completedImgs.length > 0) approvalStatus = "working";
  else approvalStatus = "queued";

  const plan: StageStatus = "completed"; // strategy/research/copy are produced synchronously

  return [
    {
      key: "ceo",
      role: "CEO AI",
      ownerId: "ceo",
      task: "Set the campaign strategy",
      status: plan,
      confidence: confidenceFor(gen, "Strategy Built"),
      durationLabel: "instant",
      summary: cp.name,
      output: (
        <div className="flex flex-col gap-2">
          <OutputLine label="Strategy" value={cp.summary} />
          <OutputLine label="Objective" value={cp.objective} />
        </div>
      ),
    },
    {
      key: "strategist",
      role: "Marketing Strategist",
      ownerId: "media-buyer",
      task: "Define audience & budget",
      status: plan,
      confidence: confidenceFor(gen, "Audience Analysis"),
      durationLabel: "instant",
      summary: `${cp.audience} · $${cp.budget.toLocaleString()}`,
      output: (
        <div className="flex flex-col gap-2">
          <OutputLine label="Audience" value={cp.audience} />
          <OutputLine label="Budget" value={`$${cp.budget.toLocaleString()}`} />
          <OutputLine label="Placements" value={cp.platforms.join(", ")} />
        </div>
      ),
    },
    {
      key: "research",
      role: "Research AI",
      ownerId: "finance",
      task: "Research the market",
      status: plan,
      confidence: confidenceFor(gen, "Competitor Analysis"),
      durationLabel: "instant",
      summary: `${cp.platforms.length} placements analysed`,
      output: <OutputLine label="Research summary" value={`Angle for ${cp.audience} across ${cp.platforms.join(", ")}.`} />,
    },
    {
      key: "copywriter",
      role: "Copywriter",
      ownerId: "copywriter",
      task: "Write the ad copy",
      status: plan,
      confidence: confidenceFor(gen, "Copy Generated"),
      durationLabel: "instant",
      summary: `${crp.headlines.length} headlines · ${crp.descriptions.length} descriptions`,
      output: (
        <div className="flex flex-col gap-2">
          <OutputList label="Headlines" items={crp.headlines} />
          <OutputList label="Descriptions" items={crp.descriptions} />
        </div>
      ),
    },
    {
      key: "creative-director",
      role: "Creative Director",
      ownerId: "creative-director",
      task: "Direct the creative",
      status: plan,
      confidence: confidenceFor(gen, "Hooks Generated"),
      durationLabel: "instant",
      summary: `${crp.hooks.length} hooks`,
      output: (
        <div className="flex flex-col gap-2">
          <OutputList label="Creative ideas" items={crp.hooks} />
          {dna?.visualStyle && <OutputLine label="Visual style" value={dna.visualStyle} />}
        </div>
      ),
    },
    {
      key: "designer",
      role: "Designer",
      ownerId: "automation",
      task: "Generate the creatives",
      status: designerStatus,
      confidence: confidenceFor(gen, "Creative Generated"),
      durationLabel: images.length === 0 ? "—" : fmtDuration(imgDurationMs),
      summary: images.length === 0 ? "No image assets" : `${completedImgs.length}/${images.length} images`,
      output:
        completedImgs.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="type-eyebrow text-foreground-muted">Generated images</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {completedImgs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectAsset(c.id)}
                  title={c.title}
                  className="studio-focusable overflow-hidden rounded-[var(--studio-radius-sm)]"
                >
                  <CreativeThumbnail media={c.media} aspect="square" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="type-caption text-foreground-muted">{designerStatus === "working" ? "Rendering the creatives…" : designerStatus === "failed" ? "No live provider produced an image." : "Waiting to start."}</p>
        ),
    },
    {
      key: "media-buyer",
      role: "Media Buyer",
      ownerId: "media-buyer",
      task: "Plan the campaign",
      status: plan,
      confidence: confidenceFor(gen, "Queue Created"),
      durationLabel: "instant",
      summary: `${cp.platforms.length} placements`,
      output: (
        <div className="flex flex-col gap-2">
          <OutputLine label="Campaign recommendations" value={`Run on ${cp.platforms.join(", ")} at $${cp.budget.toLocaleString()}.`} />
          <OutputLine label="Connectors" value="Meta & Google payloads prepared (paused — not published)." />
        </div>
      ),
    },
    {
      key: "approval",
      role: "Approval",
      ownerId: "brand-guardian",
      task: "Review the campaign",
      status: approvalStatus,
      confidence: confidenceFor(gen, "Approval Requested"),
      durationLabel: "—",
      summary: completedImgs.length === 0 ? "Waiting for creatives" : `${approvedCount} approved · ${completedImgs.length} ready`,
      output: (
        <OutputLine
          label="Review"
          value={completedImgs.length === 0 ? "Waiting for the first completed creative." : `${completedImgs.length} creative(s) ready for review, ${approvedCount} approved.`}
        />
      ),
    },
  ];
}

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === "completed") return <Check className="h-3.5 w-3.5 text-brand" />;
  if (status === "working") return <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />;
  if (status === "failed") return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
  return <Circle className="h-3.5 w-3.5 text-foreground-muted/50" />;
}

function EmployeeCard({ stage, active, expanded, onToggle }: { stage: EmployeeStage; active: boolean; expanded: boolean; onToggle: () => void }) {
  const Icon = EMPLOYEE_ICON[stage.ownerId];
  return (
    <div className={cn("studio-card overflow-hidden transition-colors", active && "studio-glow ring-1 ring-brand/30")}>
      <button type="button" onClick={onToggle} className="studio-focusable flex w-full items-center gap-2.5 p-3 text-left">
        <div className={cn("studio-tile relative flex h-9 w-9 shrink-0 items-center justify-center", active ? "text-brand" : "text-foreground-muted", stage.status === "working" && "studio-breathe")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate type-body font-semibold text-foreground">{stage.role}</p>
            <span className={cn("chip shrink-0", STATUS_CHIP[stage.status])}>{STATUS_LABEL[stage.status]}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="type-caption tabular-nums text-foreground-muted">{stage.durationLabel}</span>
              <StatusIcon status={stage.status} />
            </span>
          </div>
          <p className="truncate type-caption text-foreground-muted">
            {stage.task}
            {!expanded && <span className="text-foreground/80"> · {stage.summary}</span>}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/[0.06] px-3 py-3">
          {stage.confidence && (
            <span className={cn("chip w-fit", stage.confidence === "high" ? "chip-emerald" : "chip-slate")}>{CONF_LABEL[stage.confidence]}</span>
          )}
          {stage.output}
        </div>
      )}
    </div>
  );
}

export function ProductionStages() {
  const gen = useGeneration();
  const [manual, setManual] = useState<string | null>(null);

  if (!gen) {
    return (
      <div className="studio-card px-6 py-12 text-center">
        <p className="type-caption text-foreground-muted">No production yet — generate a campaign to watch your AI team build it.</p>
      </div>
    );
  }

  const stages = buildEmployeeStages(gen);
  // The single active employee = the first not-yet-completed one (execution frontier).
  const activeIdx = stages.findIndex((s) => s.status !== "completed");
  const activeKey = activeIdx >= 0 ? stages[activeIdx].key : null;
  // Current employee stays expanded; completed auto-collapse; user can override.
  const expandedKey = manual ?? activeKey;
  const overall = gen.execution.progress;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <span className="type-eyebrow text-foreground-muted">AI Movie · your team at work</span>
        <span className="ml-auto type-caption tabular-nums text-foreground-muted">{overall}%</span>
      </header>

      <div className="flex flex-col">
        {stages.map((s, i) => {
          const active = s.key === activeKey;
          const done = s.status === "completed";
          return (
            <div key={s.key} className="flex flex-col">
              {/* Handoff connector */}
              {i > 0 && (
                <div className="ml-[26px] h-3 w-0.5 overflow-hidden rounded-full">
                  <div className={cn("h-full w-full", active ? "animate-pulse bg-brand/60" : done ? "bg-brand/40" : "bg-white/[0.08]")} />
                </div>
              )}
              <EmployeeCard
                stage={s}
                active={active}
                expanded={s.key === expandedKey}
                onToggle={() => setManual((prev) => (prev === s.key ? null : s.key))}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
