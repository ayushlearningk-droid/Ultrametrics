"use client";

/**
 * Executive AI Dashboard — Morning Brief 3.0 (Sprint 43).
 *
 * Renders the existing Marketing Brain (health · opportunity graph · risk graph
 * · executive intelligence · daily pulse) in one executive layout, fused with
 * the already-composed BriefData (KPI strip) and the sync activity timeline.
 *
 * Orchestration + presentation ONLY — every number/string comes from an existing
 * engine (buildMarketingBrain / composeBrief). No execution, no fabricated text,
 * no new analytics. Motion exclusively from src/lib/motion.ts (Sprint 40 set);
 * surfaces use the shared design-system utilities.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity as ActivityIcon,
  TrendingUp,
  ShieldAlert,
  ListChecks,
  Gauge,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import {
  BriefActivityFeed,
  type ActivityItem,
} from "@/components/dashboard/brief-activity-feed";
import { ConfidenceBadge } from "@/components/os/ai/insight-cards";
import { useAsk } from "@/components/os/ask-provider";
import { staggerChildren, slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { BriefData } from "@/lib/ai/brief/compose-brief";
import type {
  MarketingBrain,
  Priority,
  Severity,
} from "@/lib/ai/brain/types";

/* ── Shared status helpers (strict 3-colour: emerald / muted-red / slate) ─── */

function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "chip",
        priority === "High" ? "chip-emerald" : "chip-slate"
      )}
    >
      {priority} priority
    </span>
  );
}

function SeverityChip({ severity }: { severity: Severity }) {
  const danger = severity === "critical" || severity === "high";
  return (
    <span className={cn("chip", danger ? "chip-red" : "chip-slate")}>
      {severity}
    </span>
  );
}

/** Colour for a 0–100 health score by its grounded severity. */
function scoreTone(severity: Severity): string {
  if (severity === "critical" || severity === "high") return "text-red-400/80";
  if (severity === "medium") return "text-slate-300";
  return "text-brand";
}
function barTone(severity: Severity): string {
  if (severity === "critical" || severity === "high") return "bg-red-400/70";
  if (severity === "medium") return "bg-slate-300/70";
  return "bg-brand";
}

/** Most-recent sync timestamp from the activity feed, as a label. */
function lastSyncLabel(activity: ActivityItem[]): string | null {
  let latest = 0;
  for (const a of activity) {
    const t = new Date(a.completedAt ?? a.createdAt).getTime();
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  if (!latest) return null;
  const mins = Math.floor((Date.now() - latest) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

function Section({
  icon,
  label,
  children,
  className,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h2 className="flex items-center gap-2 type-eyebrow text-foreground-muted">
        {icon}
        {label}
      </h2>
      {children}
    </section>
  );
}

export function ExecutiveDashboard({
  data,
  brain,
  activity = [],
  workspaceName = "Workspace",
  userName = null,
}: {
  data: BriefData;
  brain: MarketingBrain;
  activity?: ActivityItem[];
  workspaceName?: string;
  userName?: string | null;
}) {
  const { open, send } = useAsk();
  const reduce = useReducedMotion();

  const onPrompt = (text: string) => {
    void send(text);
    open();
  };

  const { health, opportunities, risks, executive, pulse } = brain;
  const firstName = firstNameOf(userName);
  const greeting = firstName ? `${data.greeting}, ${firstName}` : data.greeting;
  const lastSync = lastSyncLabel(activity);

  return (
    <motion.div
      className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8"
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      {/* ── 1 · Executive Header ───────────────────────────────────────── */}
      <motion.header
        variants={slideUp}
        className="surface-ai shadow-floating flex flex-col gap-6 p-6 md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="type-eyebrow text-foreground-muted">
              {data.dateLabel} · {workspaceName}
            </span>
            <h1 className="type-display text-foreground">{greeting}</h1>
            <span className="flex items-center gap-1.5 type-caption text-foreground-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {lastSync ? `Last sync · ${lastSync}` : "Awaiting first sync"}
            </span>
          </div>

          {/* AI Health Score — from the Marketing Brain health engine. */}
          <div className="surface-glass flex items-center gap-3 px-4 py-3">
            <Gauge className={cn("h-5 w-5", scoreTone(health.severity))} />
            <div className="flex flex-col">
              <span className="type-eyebrow text-foreground-muted">
                AI Health
              </span>
              <span
                className={cn(
                  "type-display tabular-nums leading-none",
                  scoreTone(health.severity)
                )}
              >
                {health.overall}
                <span className="type-caption text-foreground-muted">/100</span>
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── 2 · Executive Brief Card ───────────────────────────────────── */}
      <motion.section variants={slideUp}>
        <div className="surface-ai flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="type-eyebrow text-foreground-muted">
              Executive Brief
            </span>
            <ConfidenceBadge level={executive.confidence} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="type-caption text-foreground-muted">
              What happened
            </span>
            <p className="type-body leading-relaxed text-foreground/90">
              {executive.executiveSummary}
            </p>
          </div>

          {executive.expectedOutcome && (
            <div className="flex flex-col gap-1.5">
              <span className="type-caption text-foreground-muted">
                Why it matters
              </span>
              <p className="type-body leading-relaxed text-foreground/90">
                {executive.expectedOutcome}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {executive.topOpportunity && (
              <div className="card flex flex-col gap-1 p-4">
                <span className="type-caption text-foreground-muted">
                  Biggest opportunity
                </span>
                <p className="type-body font-semibold text-foreground">
                  {executive.topOpportunity.title}
                </p>
                <p className="type-caption text-foreground/80">
                  {executive.topOpportunity.expectedImpact}
                </p>
              </div>
            )}
            {executive.biggestRisk && (
              <div className="card flex flex-col gap-1 p-4">
                <span className="type-caption text-foreground-muted">
                  Biggest risk
                </span>
                <p className="type-body font-semibold text-foreground">
                  {executive.biggestRisk.type}
                </p>
                <p className="type-caption text-foreground/80">
                  {executive.biggestRisk.mitigation}
                </p>
              </div>
            )}
          </div>

          {executive.immediateActions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="type-caption text-foreground-muted">
                Immediate actions
              </span>
              <ul className="flex flex-col gap-1">
                {executive.immediateActions.map((a, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onPrompt(`Tell me more about: ${a}`)}
                      className="group flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="type-caption tabular-nums text-foreground-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="type-body text-foreground/90 transition-colors group-hover:text-foreground">
                        {a}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── 3 · Executive KPI Strip ────────────────────────────────────── */}
      {data.kpis.length > 0 && (
        <motion.div variants={slideUp}>
          <Section label="Yesterday at a glance">
            <KpiStrip kpis={data.kpis} />
          </Section>
        </motion.div>
      )}

      {/* ── 4 · Opportunity Center + Risk Center ───────────────────────── */}
      <motion.div
        variants={slideUp}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
      >
        <Section
          icon={<TrendingUp className="h-3.5 w-3.5 text-brand" />}
          label="Opportunity Center"
        >
          <div className="flex flex-col gap-3">
            {opportunities.length === 0 ? (
              <div className="card-muted px-4 py-5 text-center">
                <p className="type-caption text-foreground-muted">
                  No opportunities detected from current signals.
                </p>
              </div>
            ) : (
              opportunities.map((o, i) => (
                <div
                  key={`${o.type}-${i}`}
                  className="card card-hover flex flex-col gap-2 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-eyebrow text-foreground-muted">
                      {o.type}
                    </span>
                    <PriorityChip priority={o.priority} />
                  </div>
                  <p className="type-body font-semibold text-foreground">
                    {o.title}
                  </p>
                  <p className="type-caption text-foreground/80">
                    Estimated impact · {o.expectedImpact}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <ConfidenceBadge level={o.confidence} />
                    <button
                      type="button"
                      onClick={() =>
                        onPrompt(`Show me the details for this opportunity: ${o.title}`)
                      }
                      className="inline-flex items-center gap-1 type-caption font-semibold text-brand transition-colors hover:text-brand/80"
                    >
                      View details
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section
          icon={<ShieldAlert className="h-3.5 w-3.5 text-red-400/80" />}
          label="Risk Center"
        >
          <div className="flex flex-col gap-3">
            {risks.length === 0 ? (
              <div className="card-muted px-4 py-5 text-center">
                <p className="type-caption text-foreground-muted">
                  No active risks detected from current signals.
                </p>
              </div>
            ) : (
              risks.map((r, i) => (
                <div
                  key={`${r.type}-${i}`}
                  className="card card-hover flex flex-col gap-2 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-body font-semibold text-foreground">
                      {r.type}
                    </span>
                    <SeverityChip severity={r.severity} />
                  </div>
                  <p className="type-caption text-foreground/80">
                    Suggested mitigation · {r.mitigation}
                  </p>
                  <ConfidenceBadge level={r.confidence} />
                </div>
              ))
            )}
          </div>
        </Section>
      </motion.div>

      {/* ── 5 · AI Action Queue Preview (dry-run · no execution) ────────── */}
      <motion.div variants={slideUp}>
        <Section
          icon={<ListChecks className="h-3.5 w-3.5 text-foreground-muted" />}
          label="AI Action Queue Preview"
        >
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <span className="chip chip-slate">Dry-run</span>
              <span className="type-caption text-foreground-muted">
                Proposed actions — review and approve in the Action Queue.
                Nothing is executed from here.
              </span>
            </div>
            {executive.immediateActions.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="type-caption text-foreground-muted">
                  No pending actions proposed.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-white/[0.06]">
                {executive.immediateActions.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="type-body text-foreground/90">{a}</span>
                      {executive.expectedOutcome && (
                        <span className="block type-caption text-foreground-muted">
                          Estimated impact · {executive.expectedOutcome}
                        </span>
                      )}
                    </span>
                    <span className="chip chip-slate shrink-0">Preview</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </motion.div>

      {/* ── 6 · Daily Pulse ────────────────────────────────────────────── */}
      <motion.div variants={slideUp}>
        <Section
          icon={<ActivityIcon className="h-3.5 w-3.5 text-brand" />}
          label="Daily Pulse"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PulseCard title="Wins" tone="positive" items={pulse.wins} />
            <PulseCard title="Problems" tone="negative" items={pulse.problems} />
            <PulseCard
              title="Opportunities"
              tone="positive"
              items={pulse.opportunities}
            />
            <PulseCard title="Risks" tone="negative" items={pulse.risks} />
          </div>
        </Section>
      </motion.div>

      {/* ── 7 · Workspace Health (category breakdown) ──────────────────── */}
      <motion.div variants={slideUp}>
        <Section
          icon={<Gauge className="h-3.5 w-3.5 text-foreground-muted" />}
          label="Workspace Health"
        >
          <div className="card flex flex-col gap-4 p-5">
            <div className="flex items-end justify-between gap-2">
              <span className="type-caption text-foreground-muted">
                Overall score
              </span>
              <span
                className={cn(
                  "type-display tabular-nums leading-none",
                  scoreTone(health.severity)
                )}
              >
                {health.overall}
                <span className="type-caption text-foreground-muted">/100</span>
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {health.dimensions.map((d) => (
                <div key={d.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-caption text-foreground/90">
                      {d.key}
                    </span>
                    <span
                      className={cn(
                        "type-caption tabular-nums font-semibold",
                        scoreTone(d.severity)
                      )}
                    >
                      {d.score}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={cn("h-full rounded-full", barTone(d.severity))}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                  <span className="type-caption text-foreground-muted">
                    {d.explanation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </motion.div>

      {/* ── 8 · Timeline (recent sync activity) ────────────────────────── */}
      <motion.div variants={slideUp}>
        <Section label="Timeline">
          <BriefActivityFeed items={activity} />
        </Section>
      </motion.div>

      {/* ── Executive footer ───────────────────────────────────────────── */}
      <motion.footer
        variants={slideUp}
        className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-6 type-caption text-foreground-muted"
      >
        <span>Last updated · {lastSync ?? "just now"}</span>
        <span>{workspaceName}</span>
        <span>As of {data.dateLabel}</span>
      </motion.footer>
    </motion.div>
  );
}

function PulseCard({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "positive" | "negative";
  items: string[];
}) {
  const Icon = tone === "positive" ? CheckCircle2 : ShieldAlert;
  const iconColor = tone === "positive" ? "text-brand" : "text-red-400/80";
  return (
    <div className="card flex flex-col gap-2 p-4">
      <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        {title}
      </span>
      {items.length === 0 ? (
        <p className="type-caption text-foreground-muted">Nothing to report.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((x, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground-muted" />
              <span className="type-body text-foreground/90">{x}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
