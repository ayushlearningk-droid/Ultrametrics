/**
 * Analytics Skill (Sprint 48) — read-only delegate to the Reasoning Engine.
 */

import { reason } from "@/lib/ai/reasoning/engine";
import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import { BaseSkill } from "../base-skill";
import type {
  SkillCategory,
  SkillPermission,
  SkillField,
  Confidence,
  SkillInput,
  SkillRun,
} from "../types";

export class AnalyticsSkill extends BaseSkill<SkillInput, ReasoningResult> {
  readonly id = "analytics";
  readonly name = "Analytics";
  readonly description =
    "Grounded performance analysis: executive summary, diagnosis, evidence, risks, opportunities.";
  readonly category: SkillCategory = "analytics";
  readonly capabilities = [
    "executive-summary",
    "root-cause-diagnosis",
    "trend-analysis",
    "prioritized-actions",
  ];
  readonly permissions: SkillPermission[] = ["read:metrics", "read:memory"];
  readonly supportedTools = [
    "get_executive_summary",
    "get_workspace_metrics",
    "get_root_cause",
    "get_recommendations",
  ];
  readonly inputSchema: SkillField[] = [
    { name: "reasoningInput", type: "object", required: true, description: "Grounded reasoning input (headline, trends, causes, recommendations)." },
  ];
  readonly outputSchema: SkillField[] = [
    { name: "executiveSummary", type: "string", required: true, description: "One-paragraph grounded summary." },
    { name: "diagnosis", type: "string", required: false, description: "Top root cause, when present." },
    { name: "evidence", type: "array", required: true, description: "Grounded evidence lines." },
    { name: "prioritizedActions", type: "array", required: true, description: "Ranked actions." },
  ];
  readonly confidence: Confidence = "high";

  run(input: SkillInput): SkillRun<ReasoningResult> {
    if (!input.reasoningInput) {
      return { output: null, confidence: "low", notes: "reasoningInput is required." };
    }
    const result = reason(input.reasoningInput);
    return { output: result, confidence: result.confidence };
  }
}
