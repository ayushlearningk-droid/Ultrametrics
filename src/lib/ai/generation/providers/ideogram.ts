/** Ideogram — image provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const ideogramProvider: GenerationProvider = {
  id: "ideogram",
  name: "Ideogram",
  vendor: "Ideogram",
  description: "Image generation with strong in-image typography.",
  assetTypes: ["image"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["image"],
    aspectRatios: ["1:1", "16:9", "9:16", "3:4"],
    maxBatch: 4,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsImageToVideo: false,
  },
};
