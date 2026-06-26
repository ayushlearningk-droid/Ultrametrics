/**
 * AI Skills Framework — runner (Sprint 48).
 *
 * The single, defensive entry point to invoke a skill. It enforces the
 * read-only contract (a skill whose mode is not read-only is refused, never
 * run), delegates to the skill's pure `run`, and wraps the outcome in a
 * uniform SkillResult. Pure — no I/O, no execution, no side effects.
 */

import type { BaseSkill } from "./base-skill";
import type { SkillInput, SkillResult } from "./types";

export function runSkill<I extends SkillInput, O>(
  skill: BaseSkill<I, O>,
  input: I
): SkillResult<O> {
  // Hard guard: this framework only ever runs read-only analysis.
  if (skill.executionMode !== "read-only") {
    return {
      skillId: skill.id,
      ok: false,
      mode: skill.executionMode,
      output: null,
      confidence: "low",
      notes: "Refused: only read-only skills can run in this framework.",
    };
  }

  const result = skill.run(input);
  return {
    skillId: skill.id,
    ok: result.output !== null,
    mode: skill.executionMode,
    output: result.output,
    confidence: result.confidence,
    notes: result.notes,
  };
}
