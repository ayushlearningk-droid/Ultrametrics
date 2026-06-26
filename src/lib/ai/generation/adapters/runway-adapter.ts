/** Runway video adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { runwayProvider } from "../providers/runway";
import type { GenerationProvider } from "../types";

export class RunwayAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = runwayProvider;
  protected readonly costWeight = 4.0;
}
