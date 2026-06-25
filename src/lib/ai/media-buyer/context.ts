/**
 * AI Media Buyer — grounded context builder (Sprint 38).
 *
 * Gathers BOTH the CreativeInput and the ReasoningInput from the SAME read-only
 * tool handlers composeBrief uses, in a single pass. Read-only, grounded, per
 * primary provider. Returns null when there's no data to plan against.
 * Server-only.
 */

import "server-only";
import { metricsToolHandlers } from "@/lib/ai/tools/metrics-tools";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { listMemories } from "@/lib/data/workspace-memory";
import { CAPABILITIES } from "@/lib/metrics/capabilities";
import type { WorkspaceContext } from "@/lib/ai/types";
import type { MetricsProvider } from "@/lib/metrics/types";
import type { CreativeInput } from "@/lib/ai/creative/types";
import type {
  ReasoningInput,
  RecInput,
  CauseInput,
  EvidenceLevel,
} from "@/lib/ai/reasoning/types";

interface RecJson {
  action: string;
  kind?: string;
  opportunity_score?: number;
  evidence_strength?: { level?: string };
  estimated_impact?: {
    status?: string;
    ranges?: { metric: string; direction: string; lowPct: number; highPct: number }[];
    assumptions?: string[];
  };
}
interface CauseJson {
  primaryCause: string;
  severity?: string;
  confidence?: string;
  evidence?: string;
}
interface SummaryJson {
  provider: string;
  status: string;
  currency?: string;
  headline?: { spend: number; revenue: number; roas: number; ctr: number } | null;
  trends?: { metrics?: { metric: string; changeLabel: string; status: string }[] };
  watch_outs?: string[];
}

function toRecInput(r: RecJson): RecInput {
  return {
    action: r.action,
    impact: "",
    kind: r.kind,
    opportunityScore: r.opportunity_score,
    evidenceLevel: r.evidence_strength?.level as EvidenceLevel | undefined,
    impactRanges:
      r.estimated_impact?.status === "ok"
        ? (r.estimated_impact.ranges ?? []).map((rg) => ({
            metric: rg.metric,
            direction: rg.direction as "increase" | "decrease" | "recover",
            lowPct: rg.lowPct,
            highPct: rg.highPct,
          }))
        : undefined,
    impactAssumption: r.estimated_impact?.assumptions?.[0],
  };
}

export interface OptimizationContext {
  creativeInput: CreativeInput;
  reasoningInput: ReasoningInput;
}

export async function buildOptimizationContext(
  workspaceId: string,
  workspaceName: string
): Promise<OptimizationContext | null> {
  let connectedProviders: MetricsProvider[] = [];
  try {
    const connectors = await getConnectorsByWorkspace(workspaceId);
    connectedProviders = [
      ...new Set(
        connectors
          .filter((c) => c.status === "active" && c.provider in CAPABILITIES)
          .map((c) => c.provider as MetricsProvider)
      ),
    ];
  } catch {
    /* handlers resolve connectors themselves */
  }

  const ctx: WorkspaceContext = {
    workspaceId,
    workspaceName,
    connectedProviders,
    todayISO: new Date().toISOString().slice(0, 10),
  };

  try {
    const [summaryRaw, recRaw, causeRaw] = await Promise.all([
      metricsToolHandlers.get_executive_summary({}, ctx),
      metricsToolHandlers.get_recommendations({}, ctx),
      metricsToolHandlers.get_root_cause({}, ctx),
    ]);

    const summaries = (JSON.parse(summaryRaw).summaries ?? []) as SummaryJson[];
    const primary = summaries.find((s) => s.status === "ok" && s.headline);
    if (!primary || !primary.headline) return null;

    const recProviders = (JSON.parse(recRaw).providers ?? []) as {
      provider: string;
      recommendations?: RecJson[];
    }[];
    const causeProviders = (JSON.parse(causeRaw).providers ?? []) as {
      provider: string;
      causes?: CauseJson[];
    }[];

    const recs =
      recProviders.find((p) => p.provider === primary.provider)?.recommendations ?? [];
    const causes =
      causeProviders.find((p) => p.provider === primary.provider)?.causes ?? [];
    const trends = primary.trends?.metrics ?? [];
    const ctrStatus = trends.find((t) => t.metric === "ctr")?.status;
    const memories = (await listMemories(workspaceId)).map((m) => m.content);

    const creativeInput: CreativeInput = {
      roas: primary.headline.roas,
      ctr: primary.headline.ctr,
      spend: primary.headline.spend,
      ctrTrend:
        ctrStatus === "improving" || ctrStatus === "declining" || ctrStatus === "stable"
          ? ctrStatus
          : undefined,
      causes: causes.map((c) => c.primaryCause),
      recommendations: recs.map((r) => r.action),
      memories,
    };

    const reasoningInput: ReasoningInput = {
      headline: primary.headline,
      currency: primary.currency,
      trends,
      causes: causes.map(
        (c): CauseInput => ({
          primaryCause: c.primaryCause,
          severity: c.severity,
          confidence: c.confidence,
          evidence: c.evidence,
        })
      ),
      recommendations: recs.map(toRecInput),
      memories,
      watchOuts: primary.watch_outs ?? [],
    };

    return { creativeInput, reasoningInput };
  } catch {
    return null;
  }
}
