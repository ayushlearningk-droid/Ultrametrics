/**
 * Forecast model registry (Sprint 62A).
 *
 * In-memory registry keyed by model id, mirroring the Universal Search registry
 * pattern. Future forecast models register here without changing existing code.
 * Sprint 62A ships the registry only — NO models are registered yet (no
 * algorithms exist until a later sprint).
 */

import type { ForecastModel } from "./types";

const registry = new Map<string, ForecastModel>();

/** Register (or replace) a forecast model by its id. */
export function registerModel(model: ForecastModel): void {
  registry.set(model.id, model);
}

/** All registered models, in registration order. */
export function getModels(): ForecastModel[] {
  return Array.from(registry.values());
}

/** The model for an id, if registered. */
export function getModel(id: string): ForecastModel | undefined {
  return registry.get(id);
}

/** Whether any model is registered. */
export function hasModels(): boolean {
  return registry.size > 0;
}
