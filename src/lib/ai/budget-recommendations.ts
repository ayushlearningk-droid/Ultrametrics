/**
 * Ask Ultrametrics — budget reallocation engine (AI-006, Step 1).
 *
 * Pure cross-campaign rule: pair the most efficient campaign (recipient) with
 * the most wasteful one (donor) and propose shifting a fraction of the donor's
 * spend toward the recipient. Distinct from AI-005 scale/pause (per-entity) —
 * this synthesizes the two halves of one move.
 *
 * No I/O, no model calls. NOT wired into any tool/prompt (later step). Self-
 * contained types so Step 1 touches only this file.
 *
 * Caveats:
 *  - We have SPEND (actuals), not configured budgets — the suggested amount is a
 *    fraction of current spend, directional guidance, NOT an exact budget value.
 *  - Per provider / single currency; never reallocate across currencies.
 *  - Read-only: the cta is a question; nothing is changed.
 */

import type { CampaignBreakdown } from "@/lib/metrics/types";
import { MIN_SPEND } from "@/lib/ai/thresholds";

/* ── Public types ─────────────────────────────────────────────────────────── */

export type BudgetConfidence = "high" | "medium" | "low";

export interface BudgetCampaignRef {
  campaignId: string;
  campaignName: string;
  spend: number;
  roas: number;
}

export interface BudgetRecommendation {
  kind: "budget_reallocation";
  level: "account";
  action: string;
  impact: string;
  cta: string;
  confidence: BudgetConfidence;
  /** Business-impact priority, 0-100 (same scale as AI-007). */
  opportunityScore: number;
  donor: BudgetCampaignRef;
  recipient: BudgetCampaignRef;
  /** Suggested shift, a fraction of the donor's current spend (donor currency). */
  reallocationAmount: number;
}

/* ── Thresholds ───────────────────────────────────────────────────────────── */

/** Recipient must out-earn the account by this ROAS multiple. */
const RECIPIENT_ROAS_MULTIPLE = 1.25;

/** Donor must under-earn the account by this ROAS multiple (or lower). */
const DONOR_ROAS_MULTIPLE = 0.5;

/** Share of the donor's spend to suggest reallocating. */
const REALLOCATION_FRACTION = 0.25;

/** Minimum campaigns before a reallocation is trustworthy. */
const MIN_CAMPAIGNS = 3;

/* ── Scoring (mirrors AI-007 opportunity scoring) ─────────────────────────── */

const OPP_W_REVENUE = 0.45;
const OPP_W_SPEND = 0.3;
const OPP_W_SEVERITY = 0.25;
const SEVERITY = 0.7; // budget_reallocation

const CONFIDENCE_WEIGHT: Record<BudgetConfidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function money(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function ratio(value: number): string {
  return value.toFixed(2);
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/**
 * Derive a single budget reallocation recommendation, or null when there is no
 * qualifying donor/recipient pair (or too few campaigns). Recipient = highest
 * ROAS among campaigns ≥ 1.25× benchmark; donor = highest-spend campaign
 * ≤ 0.5× benchmark; both qualified by the spend floor.
 */
export function deriveBudgetRecommendations(
  campaigns: CampaignBreakdown[],
  benchmarkRoas: number,
  currency: string
): BudgetRecommendation | null {
  if (campaigns.length < MIN_CAMPAIGNS) return null;
  if (benchmarkRoas <= 0) return null;

  const qualified = campaigns.filter((c) => c.totals.spend >= MIN_SPEND);

  const recipients = qualified
    .filter((c) => c.totals.roas >= RECIPIENT_ROAS_MULTIPLE * benchmarkRoas)
    .sort((a, b) => b.totals.roas - a.totals.roas);

  const donors = qualified
    .filter((c) => c.totals.roas <= DONOR_ROAS_MULTIPLE * benchmarkRoas)
    .sort((a, b) => b.totals.spend - a.totals.spend);

  const recipient = recipients[0];
  const donor = donors[0];
  if (!recipient || !donor || recipient.campaignId === donor.campaignId) {
    return null;
  }

  const accountSpend = campaigns.reduce((acc, c) => acc + c.totals.spend, 0);
  const spendShare = accountSpend > 0 ? donor.totals.spend / accountSpend : 0;
  const roasGap = clamp01(
    (recipient.totals.roas - donor.totals.roas) / benchmarkRoas
  );

  const confidence: BudgetConfidence =
    donor.totals.spend >= 2 * MIN_SPEND ? "high" : "medium";

  const composite =
    OPP_W_REVENUE * roasGap +
    OPP_W_SPEND * clamp01(spendShare) +
    OPP_W_SEVERITY * SEVERITY;
  const opportunityScore = Math.round(
    100 * CONFIDENCE_WEIGHT[confidence] * composite
  );

  const reallocationAmount = donor.totals.spend * REALLOCATION_FRACTION;

  return {
    kind: "budget_reallocation",
    level: "account",
    action: `Shift budget from "${donor.campaignName}" to "${recipient.campaignName}".`,
    impact: `"${donor.campaignName}" (ROAS ${ratio(
      donor.totals.roas
    )}) is underperforming vs "${recipient.campaignName}" (ROAS ${ratio(
      recipient.totals.roas
    )}); consider moving ~${money(
      reallocationAmount,
      currency
    )} (25% of its ${money(donor.totals.spend, currency)} spend).`,
    cta: `Compare "${donor.campaignName}" and "${recipient.campaignName}"`,
    confidence,
    opportunityScore,
    donor: {
      campaignId: donor.campaignId,
      campaignName: donor.campaignName,
      spend: donor.totals.spend,
      roas: donor.totals.roas,
    },
    recipient: {
      campaignId: recipient.campaignId,
      campaignName: recipient.campaignName,
      spend: recipient.totals.spend,
      roas: recipient.totals.roas,
    },
    reallocationAmount,
  };
}
