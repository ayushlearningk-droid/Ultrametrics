/**
 * Ask Ultrametrics — deterministic recommendation engine (AI-005, Step 1).
 *
 * Pure rules over a single provider's MetricSet breakdown. Computes grounded,
 * actionable recommendations (scale / pause / creative refresh / budget
 * concentration / bid review / tracking issue) from the per-entity totals that
 * the metrics engine already derives. No I/O, no model calls, no randomness —
 * every number is computed here so the model relays rather than invents.
 *
 * NOT yet wired into any tool or prompt (that is Step 2). This module has no
 * callers yet by design, mirroring derive.ts at its own Step 1.
 *
 * Contract:
 *  - Runs PER PROVIDER; never blends currencies or cross-provider metrics.
 *  - Benchmark is the account totals of the same MetricSet.
 *  - Benchmark-relative rules require a minimum entity population (so the
 *    average isn't circularly defined by one entity) and the AI-004A
 *    qualification floors (so low-volume noise can't trigger advice).
 *  - tracking_issue is absolute (no benchmark / population guard).
 *  - Read-only: every cta is a question, never an executed action.
 */

import type {
  MetricSet,
  MetricTotals,
  MetricsProvider,
} from "@/lib/metrics/types";
import type { ProviderCapabilities } from "@/lib/metrics/capabilities";
import { MIN_IMPRESSIONS, MIN_SPEND, MIN_CLICKS } from "@/lib/ai/thresholds";

/* ── Public types ─────────────────────────────────────────────────────────── */

export type EntityLevel = "campaign" | "ad" | "account";

export type RecommendationKind =
  | "tracking_issue"
  | "pause"
  | "scale"
  | "creative_refresh"
  | "budget_concentration"
  | "bid_review";

export type Confidence = "high" | "medium" | "low";

export interface Recommendation {
  kind: RecommendationKind;
  provider: MetricsProvider;
  level: EntityLevel;
  entityId: string;
  entityName: string;
  /** Server-authored action line (what to do). */
  action: string;
  /** Grounding numbers vs benchmark (why). */
  impact: string;
  /** A read-only follow-up QUESTION, routed through onPrompt later. */
  cta: string;
  confidence: Confidence;
  /** 0..1, for sorting/capping. Not shown to the user directly. */
  score: number;
}

/* ── Rule constants ───────────────────────────────────────────────────────── */

/** Minimum entities before a benchmark-relative rule may fire. */
const MIN_ENTITIES = 3;

/** Cap on recommendations returned (total, across levels), by score desc. */
const MAX_RECOMMENDATIONS = 5;

const TRACKING_MIN_SPEND = 100;
const TRACKING_HIGH_SPEND = 500;

const PAUSE_MIN_SPEND = 100;
const PAUSE_ROAS_RATIO = 0.5;
const PAUSE_ROAS_FLOOR = 1.0;

const SCALE_MIN_CONVERSIONS = 5;
const SCALE_ROAS_RATIO = 1.25;
const SCALE_ROAS_FLOOR = 1.0;

const CREATIVE_CTR_RATIO = 0.5;

const CONCENTRATION_SHARE = 0.4;
const SELF_DOMINANCE_SHARE = 0.6;

const BID_CPC_RATIO = 2.0;

const CONF_HIGH = 0.66;
const CONF_MEDIUM = 0.4;

/* ── Internal shapes ──────────────────────────────────────────────────────── */

interface Entity {
  level: EntityLevel;
  id: string;
  name: string;
  totals: MetricTotals;
}

interface RuleContext {
  provider: MetricsProvider;
  currency: string;
  benchmark: MetricTotals;
  accountSpend: number;
  entityCountByLevel: Record<EntityLevel, number>;
  /**
   * AI-005A: account-wide tracking signal. When true (account revenue = 0,
   * conversions = 0, spend >= TRACKING_MIN_SPEND on a revenue-capable provider),
   * only tracking_issue recommendations are allowed — every benchmark-relative
   * rule (scale/pause/creative/concentration/bid) is blocked because the metrics
   * are not trustworthy until tracking is fixed.
   */
  trackingMode: boolean;
  hasRevenue: boolean;
  hasRoas: boolean;
  hasCtr: boolean;
  hasCpc: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function combine(v: number, e: number): number {
  return 0.5 * clamp01(v) + 0.5 * clamp01(e);
}

function bucket(score: number): Confidence {
  if (score >= CONF_HIGH) return "high";
  if (score >= CONF_MEDIUM) return "medium";
  return "low";
}

/** Cap a bucket to at most "medium" (used for concentration / self-dominant). */
function capMedium(c: Confidence): Confidence {
  return c === "high" ? "medium" : c;
}

function money(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function ratio(value: number): string {
  return value.toFixed(2);
}

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

/* ── Entity collection ────────────────────────────────────────────────────── */

function collectEntities(metricSet: MetricSet): Entity[] {
  const out: Entity[] = [];
  for (const c of metricSet.campaigns ?? []) {
    out.push({
      level: "campaign",
      id: c.campaignId,
      name: c.campaignName,
      totals: c.totals,
    });
  }
  for (const a of metricSet.assets ?? []) {
    out.push({
      level: "ad",
      id: a.assetId,
      name: a.assetName,
      totals: a.totals,
    });
  }
  return out;
}

/* ── Rules (priority order) ───────────────────────────────────────────────── */

/**
 * Evaluate a single entity against the ordered rule set and return its single
 * PRIMARY recommendation (highest-priority match), or null. Priority:
 * tracking_issue > pause > scale > creative_refresh > budget_concentration >
 * bid_review.
 */
function evaluateEntity(e: Entity, ctx: RuleContext): Recommendation | null {
  const t = e.totals;
  const b = ctx.benchmark;
  const share = ctx.accountSpend > 0 ? t.spend / ctx.accountSpend : 0;
  const selfDominant = share > SELF_DOMINANCE_SHARE;
  const enoughPeers = ctx.entityCountByLevel[e.level] >= MIN_ENTITIES;

  const base = {
    provider: ctx.provider,
    level: e.level,
    entityId: e.id,
    entityName: e.name,
  };

  // 1. tracking_issue — absolute (no benchmark / population guard).
  if (
    ctx.hasRevenue &&
    t.spend >= TRACKING_MIN_SPEND &&
    t.revenue === 0 &&
    t.conversions === 0
  ) {
    const high = t.spend >= TRACKING_HIGH_SPEND;
    return {
      ...base,
      kind: "tracking_issue",
      action: `Check conversion tracking for "${e.name}".`,
      impact: `${money(
        t.spend,
        ctx.currency
      )} spent with 0 conversions and 0 revenue — likely a tracking or pixel gap.`,
      cta: `Show "${e.name}" daily trend`,
      confidence: high ? "high" : "medium",
      score: high ? 0.8 : 0.5,
    };
  }

  // AI-005A: in Tracking Mode, no rule beyond tracking_issue may fire — the
  // account's metrics are untrustworthy until conversion tracking is fixed.
  if (ctx.trackingMode) return null;

  // 2. pause — material spend, no/very-low return.
  if (ctx.hasRoas && enoughPeers && b.roas > 0) {
    const failing =
      t.spend >= PAUSE_MIN_SPEND &&
      (t.conversions === 0 || t.roas <= PAUSE_ROAS_RATIO * b.roas) &&
      t.roas < PAUSE_ROAS_FLOOR;
    if (failing) {
      const v = t.spend / (2 * PAUSE_MIN_SPEND);
      const ev = Math.abs(t.roas - b.roas) / b.roas;
      const score = combine(v, ev);
      const conf = selfDominant ? capMedium(bucket(score)) : bucket(score);
      return {
        ...base,
        kind: "pause",
        action: `Pause or reallocate "${e.name}".`,
        impact: `${money(t.spend, ctx.currency)} spent at ROAS ${ratio(
          t.roas
        )} vs account ${ratio(b.roas)}, ${t.conversions} conversions.`,
        cta: `Compare "${e.name}" to top campaigns`,
        confidence: conf,
        score,
      };
    }
  }

  // 3. scale — qualified, profitable, well above benchmark.
  if (ctx.hasRoas && enoughPeers && b.roas > 0) {
    const qualifies =
      t.spend >= MIN_SPEND && t.clicks >= MIN_CLICKS && t.conversions >= SCALE_MIN_CONVERSIONS;
    if (
      qualifies &&
      t.roas >= SCALE_ROAS_RATIO * b.roas &&
      t.roas >= SCALE_ROAS_FLOOR
    ) {
      const v = t.spend / (2 * MIN_SPEND);
      const ev = (t.roas - b.roas) / b.roas;
      const score = combine(v, ev);
      const conf = selfDominant ? capMedium(bucket(score)) : bucket(score);
      return {
        ...base,
        kind: "scale",
        action: `Scale "${e.name}" — increase budget.`,
        impact: `ROAS ${ratio(t.roas)} vs account ${ratio(b.roas)} on ${money(
          t.spend,
          ctx.currency
        )}, ${t.conversions} conversions.`,
        cta: `Show "${e.name}" daily trend`,
        confidence: conf,
        score,
      };
    }
  }

  // 4. creative_refresh — engagement well below benchmark.
  if (ctx.hasCtr && enoughPeers && b.ctr > 0) {
    if (
      t.impressions >= MIN_IMPRESSIONS &&
      t.spend >= MIN_SPEND &&
      t.ctr <= CREATIVE_CTR_RATIO * b.ctr
    ) {
      const v = t.impressions / (2 * MIN_IMPRESSIONS);
      const ev = Math.abs(t.ctr - b.ctr) / b.ctr;
      const score = combine(v, ev);
      const conf = selfDominant ? capMedium(bucket(score)) : bucket(score);
      return {
        ...base,
        kind: "creative_refresh",
        action: `Refresh creative for "${e.name}".`,
        impact: `CTR ${pct(t.ctr)} vs account ${pct(b.ctr)} over ${
          t.impressions
        } impressions.`,
        cta: `Show best-performing ads`,
        confidence: conf,
        score,
      };
    }
  }

  // 5. budget_concentration — over-weighted underperformer (capped medium).
  if (ctx.hasRoas && enoughPeers && b.roas > 0) {
    if (share >= CONCENTRATION_SHARE && t.roas < b.roas) {
      const v = share / (2 * CONCENTRATION_SHARE);
      const ev = Math.abs(t.roas - b.roas) / b.roas;
      const score = combine(v, ev);
      return {
        ...base,
        kind: "budget_concentration",
        action: `Rebalance — "${e.name}" is ${(share * 100).toFixed(
          0
        )}% of account spend at below-average ROAS.`,
        impact: `ROAS ${ratio(t.roas)} vs account ${ratio(b.roas)}.`,
        cta: `Which campaigns have the best ROAS?`,
        confidence: capMedium(bucket(score)),
        score,
      };
    }
  }

  // 6. bid_review — cost-per-click outlier.
  if (ctx.hasCpc && enoughPeers && b.cpc > 0) {
    if (t.clicks >= MIN_CLICKS && t.cpc >= BID_CPC_RATIO * b.cpc) {
      const v = t.clicks / (2 * MIN_CLICKS);
      const ev = (t.cpc - b.cpc) / b.cpc;
      const score = combine(v, ev);
      const conf = selfDominant ? capMedium(bucket(score)) : bucket(score);
      return {
        ...base,
        kind: "bid_review",
        action: `Review bids or targeting for "${e.name}".`,
        impact: `CPC ${money(t.cpc, ctx.currency)} vs account ${money(
          b.cpc,
          ctx.currency
        )}.`,
        cta: `Show "${e.name}" breakdown`,
        confidence: conf,
        score,
      };
    }
  }

  return null;
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/**
 * Derive up to MAX_RECOMMENDATIONS recommendations for a single provider's
 * MetricSet, sorted by score descending (ties broken by entity name for
 * determinism). One primary recommendation per entity. Returns [] when no rule
 * fires or the breakdown is absent.
 */
export function deriveRecommendations(
  metricSet: MetricSet,
  capabilities: ProviderCapabilities
): Recommendation[] {
  const entities = collectEntities(metricSet);
  if (entities.length === 0) return [];

  const entityCountByLevel: Record<EntityLevel, number> = {
    campaign: entities.filter((e) => e.level === "campaign").length,
    ad: entities.filter((e) => e.level === "ad").length,
    account: 0,
  };

  const totals = metricSet.totals;
  const hasRevenue = capabilities.rawMetrics.includes("revenue");

  // AI-005A: account-wide tracking signal. Gated on revenue capability so a
  // revenue-less provider (e.g. GA4) is never falsely put into Tracking Mode.
  const trackingMode =
    hasRevenue &&
    totals.revenue === 0 &&
    totals.conversions === 0 &&
    totals.spend >= TRACKING_MIN_SPEND;

  const ctx: RuleContext = {
    provider: metricSet.provider,
    currency: metricSet.currency,
    benchmark: totals,
    accountSpend: totals.spend,
    entityCountByLevel,
    trackingMode,
    hasRevenue,
    hasRoas: capabilities.derivedMetrics.includes("roas"),
    hasCtr: capabilities.derivedMetrics.includes("ctr"),
    hasCpc: capabilities.derivedMetrics.includes("cpc"),
  };

  const recs: Recommendation[] = [];
  for (const e of entities) {
    const rec = evaluateEntity(e, ctx);
    if (rec) recs.push(rec);
  }

  // AI-005A fallback: in Tracking Mode with no entity-level tracking_issue (e.g.
  // spend spread across many sub-threshold entities), emit one account-level
  // tracking_issue so the warning is never silently dropped.
  if (trackingMode && !recs.some((r) => r.kind === "tracking_issue")) {
    const high = totals.spend >= TRACKING_HIGH_SPEND;
    recs.push({
      kind: "tracking_issue",
      provider: metricSet.provider,
      level: "account",
      entityId: "account",
      entityName: "your account",
      action: `Check conversion tracking for your account.`,
      impact: `${money(
        totals.spend,
        metricSet.currency
      )} spent account-wide with 0 conversions and 0 revenue — likely a tracking or pixel gap.`,
      cta: `Show daily trend`,
      confidence: high ? "high" : "medium",
      score: high ? 0.8 : 0.5,
    });
  }

  recs.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : a.entityName.localeCompare(b.entityName)
  );

  return recs.slice(0, MAX_RECOMMENDATIONS);
}
