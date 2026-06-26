/**
 * Workspace Skill (Sprint 48) — read-only delegate to the Marketing Brain.
 *
 * Produces the workspace-health slice (health report + daily pulse) from the
 * composed brain. Read-only diagnostics — nothing is changed.
 */

import { buildMarketingBrain } from "@/lib/ai/brain";
import type { HealthReport, DailyPulse } from "@/lib/ai/brain/types";
import { BaseSkill } from "../base-skill";
import type {
  SkillCategory,
  SkillPermission,
  SkillField,
  Confidence,
  SkillInput,
  SkillRun,
} from "../types";

export interface WorkspaceOutput {
  health: HealthReport;
  pulse: DailyPulse;
}

export class WorkspaceSkill extends BaseSkill<SkillInput, WorkspaceOutput> {
  readonly id = "workspace";
  readonly name = "Workspace";
  readonly description =
    "Workspace health scoring across nine dimensions plus the daily pulse. Read-only diagnostics.";
  readonly category: SkillCategory = "workspace";
  readonly capabilities = [
    "health-scoring",
    "dimension-breakdown",
    "daily-pulse",
  ];
  readonly permissions: SkillPermission[] = ["read:metrics", "read:memory", "read:workspace"];
  readonly supportedTools = ["get_workspace_metrics", "get_executive_summary"];
  readonly inputSchema: SkillField[] = [
    { name: "creativeInput", type: "object", required: true, description: "Grounded creative input." },
    { name: "reasoningInput", type: "object", required: true, description: "Grounded reasoning input." },
  ];
  readonly outputSchema: SkillField[] = [
    { name: "health", type: "object", required: true, description: "Overall + per-dimension health report." },
    { name: "pulse", type: "object", required: true, description: "Daily pulse." },
  ];
  readonly confidence: Confidence = "medium";

  run(input: SkillInput): SkillRun<WorkspaceOutput> {
    if (!input.creativeInput || !input.reasoningInput) {
      return {
        output: null,
        confidence: "low",
        notes: "creativeInput and reasoningInput are required.",
      };
    }
    const brain = buildMarketingBrain(input.creativeInput, input.reasoningInput);
    return {
      output: { health: brain.health, pulse: brain.pulse },
      confidence: brain.health.confidence,
    };
  }
}
