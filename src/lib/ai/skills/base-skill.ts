/**
 * AI Skills Framework — base skill (Sprint 48).
 *
 * Abstract base every built-in skill extends. It pins the descriptor contract
 * (identity · category · permissions · tools · I/O schema · confidence) and
 * forces `executionMode` to read-only, so no subclass can declare an executing
 * skill. Subclasses implement only `run`, which must delegate to a pure engine.
 */

import type {
  SkillDefinition,
  SkillCategory,
  SkillPermission,
  SkillField,
  ExecutionMode,
  Confidence,
  SkillInput,
  SkillRun,
} from "./types";

export abstract class BaseSkill<I extends SkillInput = SkillInput, O = unknown>
  implements SkillDefinition
{
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: SkillCategory;
  abstract readonly capabilities: string[];
  abstract readonly permissions: SkillPermission[];
  abstract readonly supportedTools: string[];
  abstract readonly inputSchema: SkillField[];
  abstract readonly outputSchema: SkillField[];
  abstract readonly confidence: Confidence;

  /** Fixed for the entire framework — nothing here executes. */
  readonly executionMode: ExecutionMode = "read-only";

  /** Run the skill against grounded input. Pure: must never mutate `input`. */
  abstract run(input: I): SkillRun<O>;

  /** The serializable descriptor (no functions) — for UIs, catalogs, eval. */
  describe(): SkillDefinition {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      capabilities: this.capabilities,
      permissions: this.permissions,
      supportedTools: this.supportedTools,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      confidence: this.confidence,
      executionMode: this.executionMode,
    };
  }
}
