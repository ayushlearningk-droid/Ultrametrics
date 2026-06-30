"use client";

/**
 * Production Prompt Composer — inspector previews (Sprint 63).
 *
 * Deterministic, presentation-only previews that REUSE existing runtimes:
 *  • ForecastPreview  → the Forecast Foundation (forecast + buildForecastSummary)
 *  • AITeamPreview    → the AI Employees registry
 *  • CostEstimator / ProviderReadiness / GenerateButton → deterministic estimates
 * No backend, no AI, no generation.
 */

import { Sparkles, TrendingUp, Users, Server, Coins, Clock, Hash, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { forecast, buildForecastSummary, type ForecastInput } from "@/lib/ai/forecast";
import { EMPLOYEES, EMPLOYEE_ICON } from "@/components/studio/employees/employees-data";
import { useComposer } from "./composer-context";
import { deriveCost, forecastSeed, FORECAST_METRIC, FORECAST_HORIZON } from "./composer-data";

const TONE_CHIP: Record<"positive" | "neutral" | "negative", string> = {
  positive: "chip-emerald",
  neutral: "chip-slate",
  negative: "chip-red",
};

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="studio-card flex flex-col gap-3 p-4">
      <h3 className="flex items-center gap-2 type-eyebrow text-foreground-muted">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 type-caption text-foreground-muted">
        {icon}
        {label}
      </span>
      <span className="type-caption tabular-nums font-semibold text-foreground/90">{value}</span>
    </div>
  );
}

/* ── ForecastPreview — real Forecast Foundation ──────────────────────────── */
export function ForecastPreview() {
  const { brief } = useComposer();
  const input: ForecastInput = {
    metric: FORECAST_METRIC,
    horizon: FORECAST_HORIZON,
    history: forecastSeed(brief.budget, brief.objective),
  };
  const summary = buildForecastSummary(forecast(input, "trend-projection"));

  return (
    <Panel icon={<TrendingUp className="h-3.5 w-3.5 text-brand" />} title="Forecast · Expected results">
      <div className="flex items-end gap-2">
        <span className="type-display text-2xl tabular-nums text-foreground">{summary.endValueLabel}</span>
        <span className="mb-1 type-caption text-foreground-muted">{summary.metricLabel} ({summary.horizonLabel})</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("chip", TONE_CHIP[summary.trend.tone])}>{summary.trend.label} {summary.changeLabel}</span>
        <span className={cn("chip", TONE_CHIP[summary.confidence.tone])}>{summary.confidence.label}</span>
        <span className={cn("chip", TONE_CHIP[summary.risk.tone])}>{summary.risk.label}</span>
      </div>
      <p className="type-caption text-foreground-muted">{summary.basis}</p>
    </Panel>
  );
}

/* ── AITeamPreview — real Employees registry ─────────────────────────────── */
export function AITeamPreview() {
  return (
    <Panel icon={<Users className="h-3.5 w-3.5 text-brand" />} title="AI team · Selected">
      <div className="flex flex-col gap-2">
        {EMPLOYEES.map((e) => {
          const Icon = EMPLOYEE_ICON[e.id];
          return (
            <div key={e.id} className="flex items-center gap-2.5">
              <div className="studio-tile flex h-8 w-8 items-center justify-center text-foreground-muted">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate type-caption font-semibold text-foreground">{e.name}</p>
                <p className="truncate type-caption text-foreground-muted">{e.role}</p>
              </div>
              <span className="chip chip-emerald">Ready</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ── CostEstimator — deterministic estimate ──────────────────────────────── */
export function CostEstimator() {
  const { filledCount, brief } = useComposer();
  const { tokens, costUsd, timeSec } = deriveCost(filledCount, brief.duration);
  return (
    <Panel icon={<Coins className="h-3.5 w-3.5 text-brand" />} title="Estimate">
      <Row icon={<Hash className="h-3 w-3" />} label="Estimated tokens" value={tokens.toLocaleString("en-US")} />
      <Row icon={<Coins className="h-3 w-3" />} label="Estimated cost" value={`$${costUsd.toFixed(2)}`} />
      <Row icon={<Clock className="h-3 w-3" />} label="Estimated time" value={`~${timeSec}s`} />
    </Panel>
  );
}

/* ── ProviderReadiness — reserved (no provider system this sprint) ────────── */
const PROVIDERS = ["OpenAI", "Anthropic", "ElevenLabs", "Runway"];
export function ProviderReadiness() {
  return (
    <Panel icon={<Server className="h-3.5 w-3.5 text-brand" />} title="Provider readiness">
      <div className="flex flex-col gap-2">
        {PROVIDERS.map((p) => (
          <div key={p} className="flex items-center justify-between gap-2">
            <span className="type-caption text-foreground/90">{p}</span>
            <span className="chip chip-slate">Reserved</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── GenerateButton — outcome-first CTA (inert; no generation) ───────────── */
export function GenerateButton({ loading = false }: { loading?: boolean }) {
  const { ready } = useComposer();
  const enabled = ready && !loading;
  return (
    <button
      type="button"
      disabled={!enabled}
      aria-disabled={!enabled}
      title={ready ? "Coming soon" : "Choose an outcome and add an offer"}
      className={cn(
        "studio-focusable flex w-full items-center justify-center gap-2 rounded-[var(--studio-radius-md)] px-4 py-3 type-body font-semibold transition-colors",
        enabled ? "bg-brand text-[hsl(var(--brand-foreground))]" : "cursor-default bg-brand/15 text-brand opacity-70"
      )}
    >
      {loading ? (
        <>
          <Sparkles className="h-4 w-4 animate-pulse" /> Preparing the team…
        </>
      ) : (
        <>
          Generate campaign <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
