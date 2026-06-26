/**
 * Reporting Skill (Sprint 48) — read-only delegate to the Marketing Brain.
 *
 * Produces the executive-report slice (executive intelligence + daily pulse)
 * from the composed brain. Planning/presentation only — no export side effects.
 */

import { buildMarketingBrain } from "@/lib/ai/brain";
import type {
  ExecutiveIntelligence,
  DailyPulse,
} from "@/lib/ai/brain/types";
import { BaseSkill } from "../base-skill";
import type {
  SkillCategory,
  SkillPermission,
  SkillField,
  Confidence,
  SkillInput,
  SkillRun,
} from "../types";

export interface ReportOutput {
  executive: ExecutiveIntelligence;
  pulse: DailyPulse;
}

export class ReportingSkill extends BaseSkill<SkillInput, ReportOutput> {
  readonly id = "reporting";
  readonly name = "Reporting";
  readonly description =
    "Composes the executive report slice (executive intelligence + daily pulse) from the marketing brain.";
  readonly category: SkillCategory = "reporting";
  readonly capabilities = [
    "executive-report",
    "daily-pulse",
    "summary-composition",
  ];
  readonly permissions: SkillPermission[] = ["read:metrics", "read:memory", "read:reports"];
  readonly supportedTools = ["get_executive_summary", "get_recommendations"];
  readonly inputSchema: SkillField[] = [
    { name: "creativeInput", type: "object", required: true, description: "Grounded creative input." },
    { name: "reasoningInput", type: "object", required: true, description: "Grounded reasoning input." },
  ];
  readonly outputSchema: SkillField[] = [
    { name: "executive", type: "object", required: true, description: "Executive intelligence (summary, top opp/risk, actions)." },
    { name: "pulse", type: "object", required: true, description: "Daily pulse (wins, problems, opportunities, risks)." },
  ];
  readonly confidence: Confidence = "high";

  run(input: SkillInput): SkillRun<ReportOutput> {
    if (!input.creativeInput || !input.reasoningInput) {
      return {
        output: null,
        confidence: "low",
        notes: "creativeInput and reasoningInput are required.",
      };
    }
    const brain = buildMarketingBrain(input.creativeInput, input.reasoningInput);
    return {
      output: { executive: brain.executive, pulse: brain.pulse },
      confidence: brain.executive.confidence,
    };
  }
}
