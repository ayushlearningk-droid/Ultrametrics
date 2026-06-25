/**
 * Creative Studio — grounded context builder (Sprint 37).
 *
 * Assembles a CreativeInput from the SAME read-only tool handlers composeBrief
 * uses (get_executive_summary / get_recommendations / get_root_cause) plus
 * workspace memory. Read-only, grounded, per-primary-provider (never blends).
 * Returns null when there's no data to ground the studio. Server-only.
 */

import "server-only";
import { metricsToolHandlers } from "@/lib/ai/tools/metrics-tools";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { listMemories } from "@/lib/data/workspace-memory";
import { CAPABILITIES } from "@/lib/metrics/capabilities";
import type { WorkspaceContext } from "@/lib/ai/types";
import type { MetricsProvider } from "@/lib/metrics/types";
import type { CreativeInput } from "./types";

interface SummaryJson {
  provider: string;
  status: string;
  headline?: { spend: number; revenue: number; roas: number; ctr: number } | null;
  trends?: { metrics?: { metric: string; status: string }[] };
}

export async function buildCreativeInput(
  workspaceId: string,
  workspaceName: string
): Promise<CreativeInput | null> {
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

    const recProviders =
      (JSON.parse(recRaw).providers ?? []) as {
        provider: string;
        recommendations?: { action: string }[];
      }[];
    const causeProviders =
      (JSON.parse(causeRaw).providers ?? []) as {
        provider: string;
        causes?: { primaryCause: string }[];
      }[];

    const recs =
      recProviders.find((p) => p.provider === primary.provider)?.recommendations ?? [];
    const causes =
      causeProviders.find((p) => p.provider === primary.provider)?.causes ?? [];
    const trends = primary.trends?.metrics ?? [];
    const ctrStatus = trends.find((t) => t.metric === "ctr")?.status;

    const memories = (await listMemories(workspaceId)).map((m) => m.content);

    return {
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
  } catch {
    return null;
  }
}
