/**
 * Media Buyer Skill (Sprint 48) — read-only delegate to the Optimization Plan.
 */

import { buildOptimizationPlan } from "@/lib/ai/media-buyer/plan";
import type { OptimizationPlan } from "@/lib/ai/media-buyer/types";
import { BaseSkill } from "../base-skill";
import type {
  SkillCategory,
  SkillPermission,
  SkillField,
  Confidence,
  SkillInput,
  SkillRun,
} from "../types";

export class MediaBuyerSkill extends BaseSkill<SkillInput, OptimizationPlan> {
  readonly id = "media-buyer";
  readonly name = "Media Buyer";
  readonly description =
    "Senior-buyer optimization plan across budget, audience, placement, creative, bidding, scaling. Planning only.";
  readonly category: SkillCategory = "media-buyer";
  readonly capabilities = [
    "optimization-plan",
    "problem-detection",
    "opportunity-detection",
    "category-recommendations",
  ];
  readonly permissions: SkillPermission[] = ["read:metrics", "read:memory", "read:creative"];
  readonly supportedTools = [
    "get_executive_summary",
    "get_recommendations",
    "get_root_cause",
  ];
  readonly inputSchema: SkillField[] = [
    { name: "creativeInput", type: "object", required: true, description: "Grounded creative input." },
    { name: "reasoningInput", type: "object", required: true, description: "Grounded reasoning input." },
  ];
  readonly outputSchema: SkillField[] = [
    { name: "executiveSummary", type: "string", required: true, description: "Plan summary." },
    { name: "recommendations", type: "array", required: true, description: "Six-category optimization recommendations." },
    { name: "opportunities", type: "array", required: true, description: "Detected opportunities." },
  ];
  readonly confidence: Confidence = "high";

  run(input: SkillInput): SkillRun<OptimizationPlan> {
    if (!input.creativeInput || !input.reasoningInput) {
      return {
        output: null,
        confidence: "low",
        notes: "creativeInput and reasoningInput are required.",
      };
    }
    const plan = buildOptimizationPlan(input.creativeInput, input.reasoningInput);
    return { output: plan, confidence: plan.confidence };
  }
}
