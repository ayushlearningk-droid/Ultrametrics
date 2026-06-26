/**
 * Creative Skill (Sprint 48) — read-only delegate to Creative Intelligence.
 */

import { computeCreativeSignals } from "@/lib/ai/creative/intelligence";
import type { CreativeSignals } from "@/lib/ai/creative/types";
import { BaseSkill } from "../base-skill";
import type {
  SkillCategory,
  SkillPermission,
  SkillField,
  Confidence,
  SkillInput,
  SkillRun,
} from "../types";

export class CreativeSkill extends BaseSkill<SkillInput, CreativeSignals> {
  readonly id = "creative";
  readonly name = "Creative";
  readonly description =
    "Derives creative-quality signals (fatigue, hook/CTA/offer/audience quality) from grounded performance.";
  readonly category: SkillCategory = "creative";
  readonly capabilities = [
    "fatigue-scoring",
    "hook-quality",
    "messaging-diagnostics",
    "creative-signals",
  ];
  readonly permissions: SkillPermission[] = ["read:metrics", "read:creative"];
  readonly supportedTools = ["get_workspace_metrics", "get_root_cause"];
  readonly inputSchema: SkillField[] = [
    { name: "creativeInput", type: "object", required: true, description: "Grounded creative input (roas, ctr, frequency, causes)." },
  ];
  readonly outputSchema: SkillField[] = [
    { name: "fatigueScore", type: "number", required: true, description: "0–100 derived fatigue indicator." },
    { name: "hookQuality", type: "string", required: true, description: "strong | moderate | weak | unknown." },
    { name: "messagingProblems", type: "array", required: true, description: "Detected messaging issues." },
  ];
  readonly confidence: Confidence = "medium";

  run(input: SkillInput): SkillRun<CreativeSignals> {
    if (!input.creativeInput) {
      return { output: null, confidence: "low", notes: "creativeInput is required." };
    }
    const signals = computeCreativeSignals(input.creativeInput);
    return { output: signals, confidence: signals.confidence };
  }
}
