/**
 * AI Skills Framework — registry (Sprint 48).
 *
 * A pure in-memory catalog of skills. Deterministic insertion order; duplicate
 * ids are rejected. No I/O. The default registry is seeded with the built-in
 * skills so consumers (future UI, eval) have one source of truth.
 */

import type { BaseSkill } from "./base-skill";
import type { SkillCategory, SkillDefinition } from "./types";
import { BUILT_IN_SKILLS } from "./built-in";

export class SkillRegistry {
  private readonly skills = new Map<string, BaseSkill>();

  register(skill: BaseSkill): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill already registered: ${skill.id}`);
    }
    this.skills.set(skill.id, skill);
  }

  get(id: string): BaseSkill | undefined {
    return this.skills.get(id);
  }

  has(id: string): boolean {
    return this.skills.has(id);
  }

  list(): BaseSkill[] {
    return [...this.skills.values()];
  }

  listByCategory(category: SkillCategory): BaseSkill[] {
    return this.list().filter((s) => s.category === category);
  }

  /** Serializable descriptors for every registered skill. */
  describeAll(): SkillDefinition[] {
    return this.list().map((s) => s.describe());
  }
}

/** Build a registry seeded with the built-in skills (deterministic order). */
export function createDefaultRegistry(): SkillRegistry {
  const registry = new SkillRegistry();
  for (const skill of BUILT_IN_SKILLS) registry.register(skill);
  return registry;
}
