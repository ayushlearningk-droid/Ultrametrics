/**
 * Ask Ultrametrics — structured action extraction (Sprint 13B).
 *
 * Pure parser that turns a get_recommendations tool-result JSON string into
 * ActionRecommendation[] — the grounded, structured carrier the client uses to
 * persist an approved recommendation's real provider/entity/action (never parsed
 * from the rendered prose).
 *
 * Safety: only fields actually present in the tool output are carried. `kind` is
 * mapped to a supported action_type ONLY when unambiguous (pause → PAUSE_CAMPAIGN);
 * everything else is null (never guessed). No I/O, no model calls.
 */

import type { ActionRecommendation } from "@/lib/ai/types";

type EntityLevel = ActionRecommendation["entityLevel"];
type ActionType = ActionRecommendation["actionType"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asEntityLevel(v: unknown): EntityLevel | null {
  return v === "account" || v === "campaign" || v === "ad" ? v : null;
}

/**
 * Map a recommendation `kind` to a supported, executable action type — ONLY when
 * unambiguous. `pause` → PAUSE_CAMPAIGN. Everything else (scale, budget_*,
 * creative_refresh, bid_review, diagnostics, …) has no safe 1:1 mapping and
 * returns null rather than guessing.
 */
function mapActionType(kind: unknown): ActionType {
  return kind === "pause" ? "PAUSE_CAMPAIGN" : null;
}

/**
 * Extract structured recommendations from a get_recommendations tool result.
 * Returns [] for any malformed/empty input. Each item carries the provider,
 * entity level/id, and a safely-mapped action type — verbatim from the tool,
 * never inferred from prose.
 */
export function parseRecommendationsResult(
  resultText: string
): ActionRecommendation[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(resultText);
  } catch {
    return [];
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.providers)) return [];

  const out: ActionRecommendation[] = [];
  for (const p of parsed.providers) {
    if (!isRecord(p)) continue;
    const provider = typeof p.provider === "string" ? p.provider : null;
    const recs = p.recommendations;
    if (!provider || !Array.isArray(recs)) continue;

    for (const r of recs) {
      if (!isRecord(r)) continue;
      const entityLevel = asEntityLevel(r.level);
      const entityId = typeof r.entity_id === "string" ? r.entity_id : null;
      if (!entityLevel || !entityId) continue;

      out.push({
        provider,
        entityLevel,
        entityId,
        actionType: mapActionType(r.kind),
        title: typeof r.action === "string" ? r.action : "",
        params: null,
      });
    }
  }
  return out;
}
