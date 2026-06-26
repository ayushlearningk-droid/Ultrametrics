/**
 * AI Skills Framework (Sprint 48) — single entry point.
 *
 * A generic, reusable, READ-ONLY descriptor layer over the existing engines
 * (Reasoning · Creative · Media Buyer · Marketing Brain). Skills self-describe
 * and run by delegating to a pure engine — no execution, no I/O, no provider/DB
 * access. Future UI and orchestration consume these exports.
 */

export * from "./types";
export { BaseSkill } from "./base-skill";
export { runSkill } from "./runner";
export { SkillRegistry, createDefaultRegistry } from "./registry";
export * from "./built-in";
