"use client";

/**
 * Campaign Generation Runtime — workspace feeds (Sprint 63O · real projection in 64AC).
 *
 * The Timeline and Activity feeds are now PURE PROJECTIONS of real execution.
 * They render nothing fabricated: every event is derived from the Generation
 * Store's execution state (each asset's running / completed / failed with real
 * startedAt · completedAt · provider · generationTimeMs · persistence) merged
 * with the appended approval / regeneration events. No BASE clock, no hardcoded
 * durations, no fake research events. The store is the single source of truth;
 * this file only projects it. No mutation, no new event logging.
 */

import { Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import type { EmployeeId } from "@/components/studio/employees/types";
import { useRegions } from "@/components/studio/workspace/region-manager";
import { useGeneration, selectAsset } from "./generation-store";
import type { GenerationResult } from "./generation-runtime";
import { ExplainButton } from "./explanation-panel";

/** Focus the linked asset across regions, then surface the Inspector. */
function openAsset(showRegion: (id: "inspector", zone: "float") => void, assetId?: string) {
  selectAsset(assetId ?? null);
  showRegion("inspector", "float");
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

type FeedTone = "running" | "done" | "failed";

interface FeedEvent {
  id: string;
  at: number;
  ownerId: EmployeeId;
  title: string;
  detail?: string;
  tone: FeedTone;
  durationSec?: number;
  stage: string | null;
  assetId?: string;
}

const TONE_CHIP: Record<FeedTone, string> = { running: "chip-slate", done: "chip-emerald", failed: "chip-red" };
const TONE_LABEL: Record<FeedTone, string> = { running: "Running", done: "Done", failed: "Failed" };

function ToneIcon({ tone }: { tone: FeedTone }) {
  if (tone === "running") return <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-brand" />;
  if (tone === "failed") return <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />;
  return <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />;
}

/** Project real per-asset execution into feed events (one per asset's current state). */
function executionEvents(gen: GenerationResult): FeedEvent[] {
  const out: FeedEvent[] = [];
  for (const c of gen.creatives) {
    const ex = c.execution;
    if (!ex) continue;
    if (ex.status === "running" && ex.startedAt) {
      out.push({
        id: `${c.id}-run`,
        at: ex.startedAt,
        ownerId: c.ownerId,
        title: "Generating",
        detail: `${c.title}${ex.provider ? ` · ${ex.provider}` : ""}`,
        tone: "running",
        stage: "Creative Generated",
        assetId: c.id,
      });
    } else if (ex.status === "completed" && ex.completedAt) {
      const durMs = ex.generationTimeMs ?? (ex.startedAt ? ex.completedAt - ex.startedAt : undefined);
      out.push({
        id: `${c.id}-done`,
        at: ex.completedAt,
        ownerId: c.ownerId,
        title: "Completed",
        detail: `${c.title}${ex.provider ? ` · via ${ex.provider}` : ""}${ex.mediaUrl ? " · saved to storage" : ""}`,
        tone: "done",
        durationSec: durMs != null ? Math.max(0, Math.round(durMs / 1000)) : undefined,
        stage: "Creative Generated",
        assetId: c.id,
      });
    } else if (ex.status === "failed" || ex.status === "cancelled") {
      out.push({
        id: `${c.id}-fail`,
        at: ex.completedAt ?? ex.startedAt ?? gen.createdAt,
        ownerId: c.ownerId,
        title: "Failed",
        detail: `${c.title}${ex.error ? ` · ${ex.error}` : ""}`,
        tone: "failed",
        stage: "Creative Generated",
        assetId: c.id,
      });
    }
  }
  return out;
}

/** Execution events + appended approval / regeneration events, sorted by real time. */
function timelineFeed(gen: GenerationResult): FeedEvent[] {
  const appended: FeedEvent[] = gen.timeline.map((t) => ({
    id: t.id,
    at: t.at,
    ownerId: t.ownerId,
    title: t.stage,
    detail: t.detail,
    tone: "done",
    durationSec: t.durationSec || undefined,
    stage: t.stage,
    assetId: t.assetId,
  }));
  return [...executionEvents(gen), ...appended].sort((a, b) => a.at - b.at);
}

function activityFeed(gen: GenerationResult): FeedEvent[] {
  const appended: FeedEvent[] = gen.activity.map((a) => ({
    id: a.id,
    at: a.at,
    ownerId: a.authorId,
    title: a.title,
    detail: a.description,
    tone: "done",
    stage: a.stage ?? null,
    assetId: a.assetId,
  }));
  return [...executionEvents(gen), ...appended].sort((a, b) => a.at - b.at);
}

/**
 * Live Timeline — a pure projection of real execution for the active campaign.
 * Each event shows its real time, responsible AI employee, status and (for
 * completed assets) real duration; selecting one opens the Inspector.
 */
export function GenerationTimeline() {
  const gen = useGeneration();
  const { showRegion } = useRegions();
  if (!gen) return null;
  const events = timelineFeed(gen);
  return (
    <section className="studio-card flex flex-col gap-2 p-3">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
        <span className="truncate">{gen.campaignPlan.name}</span>
      </header>
      {events.length === 0 ? (
        <p className="type-caption text-foreground-muted">Waiting for execution…</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((e) => {
            const Icon = EMPLOYEE_ICON[e.ownerId];
            return (
              <li key={e.id} className="flex items-start gap-1">
                <button
                  type="button"
                  onClick={() => openAsset(showRegion, e.assetId)}
                  title="Open in Inspector"
                  className="studio-focusable flex min-w-0 flex-1 items-start gap-2.5 rounded-[var(--studio-radius-sm)] p-1.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="studio-tile flex h-7 w-7 shrink-0 items-center justify-center text-foreground-muted">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate type-caption font-semibold text-foreground">{e.title}</p>
                      <span className={`chip shrink-0 ${TONE_CHIP[e.tone]}`}>{TONE_LABEL[e.tone]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 type-caption text-foreground-muted">
                      <span>{employeeName(e.ownerId)}</span>
                      {e.detail && <span className="truncate text-brand">{e.detail}</span>}
                      <span className="tabular-nums">{fmtTime(e.at)}</span>
                      {e.durationSec != null && <span className="tabular-nums">{e.durationSec}s</span>}
                    </div>
                  </div>
                  <ToneIcon tone={e.tone} />
                </button>
                <ExplainButton stage={e.stage} className="mt-1 shrink-0" />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * Live Activity — a pure projection of real execution + approval / regeneration
 * events. Each event shows the employee, real timestamp, status, and a short
 * description; clicking one opens the Inspector to focus the linked asset.
 */
export function GenerationActivity() {
  const gen = useGeneration();
  const { showRegion } = useRegions();
  if (!gen) return null;
  const events = activityFeed(gen);
  if (events.length === 0) {
    return <p className="type-caption text-foreground-muted">No activity yet — generation will appear here in real time.</p>;
  }
  return (
    <section className="flex flex-col gap-2">
      {events.map((a) => {
        const Icon = EMPLOYEE_ICON[a.ownerId];
        return (
          <div key={a.id} className="studio-card flex items-start gap-2.5 p-3">
            <button
              type="button"
              onClick={() => openAsset(showRegion, a.assetId)}
              title="Open in Inspector"
              className="studio-focusable flex min-w-0 flex-1 items-start gap-2.5 text-left"
            >
              <div className="studio-tile flex h-8 w-8 shrink-0 items-center justify-center text-foreground-muted">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate type-caption font-semibold text-foreground">{employeeName(a.ownerId)}</p>
                  <span className={`chip shrink-0 ${TONE_CHIP[a.tone]}`}>{TONE_LABEL[a.tone]}</span>
                  <span className="ml-auto shrink-0 type-caption tabular-nums text-foreground-muted">{fmtTime(a.at)}</span>
                </div>
                <p className="type-caption font-medium text-foreground">{a.title}</p>
                {a.detail && <p className="type-caption text-foreground-muted">{a.detail}</p>}
              </div>
            </button>
            <ExplainButton stage={a.stage} className="shrink-0" />
          </div>
        );
      })}
    </section>
  );
}
