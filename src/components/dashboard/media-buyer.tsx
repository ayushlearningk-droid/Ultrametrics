"use client";

/**
 * AI Media Buyer workspace (Sprint 38).
 *
 * Renders the deterministic optimization plan (executive summary, problems,
 * opportunities, and the six category plans) + an Action Queue PREVIEW. Planning
 * only — nothing here executes or edits a campaign. Reuses dashboard rhythm,
 * tokens, motion.ts, and the insight-card kit.
 */

import { motion, useReducedMotion } from "framer-motion";
import {
  Wallet,
  Users,
  LayoutGrid,
  Image as ImageIcon,
  Gauge,
  TrendingUp,
  ListChecks,
} from "lucide-react";
import { staggerChildren, slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ConfidenceBadge,
  CopyButton,
  BulletListCard,
} from "@/components/os/ai/insight-cards";
import type { OptimizationPlan, OptCategory } from "@/lib/ai/media-buyer/types";

const CATEGORY_ICON: Record<OptCategory, React.ElementType> = {
  Budget: Wallet,
  Audience: Users,
  Placement: LayoutGrid,
  Creative: ImageIcon,
  Bidding: Gauge,
  Scaling: TrendingUp,
};

function PriorityChip({ priority }: { priority: "High" | "Medium" | "Low" }) {
  return (
    <span className={cn("chip", priority === "High" ? "chip-emerald" : "chip-slate")}>
      {priority}
    </span>
  );
}

function RecCard({
  rec,
}: {
  rec: OptimizationPlan["recommendations"][number];
}) {
  const Icon = CATEGORY_ICON[rec.category];
  return (
    <div className="card card-hover flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 type-eyebrow text-foreground-muted">
          <Icon className="h-3.5 w-3.5 text-brand" />
          {rec.category}
        </span>
        <div className="flex items-center gap-1.5">
          <ConfidenceBadge level={rec.confidence} />
          <PriorityChip priority={rec.priority} />
        </div>
      </div>
      <p className="type-body font-semibold text-foreground">{rec.action}</p>
      <dl className="flex flex-col gap-1.5">
        {[
          ["Why", rec.why],
          ["Expected outcome", rec.expectedOutcome],
          ["Risk", rec.risk],
          ["Estimated impact", rec.estimatedImpact],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="type-caption text-foreground-muted">{label}</dt>
            <dd className="type-caption text-foreground/90">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function MediaBuyer({
  plan,
  workspaceName,
}: {
  plan: OptimizationPlan;
  workspaceName: string;
}) {
  const reduce = useReducedMotion();

  const planText = plan.recommendations
    .map(
      (r) =>
        `[${r.priority}] ${r.category}: ${r.action}\n  Why: ${r.why}\n  Outcome: ${r.expectedOutcome}\n  Risk: ${r.risk}\n  Impact: ${r.estimatedImpact}`
    )
    .join("\n\n");

  return (
    <motion.div
      className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 md:px-6"
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      <motion.header variants={slideUp} className="flex flex-col gap-2">
        <span className="type-eyebrow text-foreground-muted">
          Media Buyer · {workspaceName}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="type-display text-foreground">Optimization Plan</h1>
          <ConfidenceBadge level={plan.confidence} />
        </div>
        <p className="type-body text-foreground-muted">
          A senior-buyer review of your data. Planning only — nothing here is
          executed or changes a campaign.
        </p>
      </motion.header>

      {/* Executive Summary */}
      <motion.section variants={slideUp} className="flex flex-col gap-2">
        <h2 className="type-eyebrow text-foreground-muted">Executive Summary</h2>
        <div className="card p-4">
          <p className="type-body leading-relaxed text-foreground/90">
            {plan.executiveSummary}
          </p>
        </div>
      </motion.section>

      {/* Problems + Opportunities */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {plan.problemsFound.length > 0 && (
          <motion.section variants={slideUp} className="flex flex-col gap-2">
            <h2 className="type-eyebrow text-foreground-muted">Problems Found</h2>
            <div className="card p-4">
              <BulletListCard items={plan.problemsFound} />
            </div>
          </motion.section>
        )}
        {plan.opportunities.length > 0 && (
          <motion.section variants={slideUp} className="flex flex-col gap-2">
            <h2 className="type-eyebrow text-foreground-muted">Opportunities</h2>
            <div className="card p-4">
              <BulletListCard items={plan.opportunities} />
            </div>
          </motion.section>
        )}
      </div>

      {/* Category plans */}
      <motion.section variants={slideUp} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="type-eyebrow text-foreground-muted">Optimization Plans</h2>
          <CopyButton text={planText} label="Copy plan" />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {plan.recommendations.map((rec) => (
            <RecCard key={rec.category} rec={rec} />
          ))}
        </div>
      </motion.section>

      {/* Action Queue Preview (planning only — not enqueued/executed) */}
      <motion.section variants={slideUp} className="flex flex-col gap-2">
        <h2 className="type-eyebrow text-foreground-muted">Action Queue Preview</h2>
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
            <ListChecks className="h-3.5 w-3.5 text-foreground-muted" />
            <span className="type-caption text-foreground-muted">
              Proposed actions — review and approve in the Action Queue. Nothing
              is executed from here.
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-white/[0.06]">
            {plan.recommendations.map((rec) => (
              <li
                key={rec.category}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="type-body text-foreground/90">{rec.action}</span>
                  <span className="block type-caption text-foreground-muted">
                    {rec.category}
                  </span>
                </span>
                <PriorityChip priority={rec.priority} />
              </li>
            ))}
          </ul>
        </div>
      </motion.section>
    </motion.div>
  );
}
