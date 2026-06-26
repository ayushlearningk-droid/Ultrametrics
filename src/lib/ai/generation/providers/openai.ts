/** OpenAI (gpt-image) — image provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const openaiProvider: GenerationProvider = {
  id: "openai",
  name: "OpenAI Images",
  vendor: "OpenAI",
  description: "High-fidelity image generation (gpt-image).",
  assetTypes: ["image"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["image"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:5"],
    maxBatch: 4,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsImageToVideo: false,
  },
};
