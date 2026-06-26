/** OpenAI image adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { openaiProvider } from "../providers/openai";
import type { GenerationProvider } from "../types";

export class OpenAIAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = openaiProvider;
  protected readonly costWeight = 1.2;
}
