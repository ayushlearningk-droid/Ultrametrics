/** Flux (Black Forest Labs) — image provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const fluxProvider: GenerationProvider = {
  id: "flux",
  name: "Flux",
  vendor: "Black Forest Labs",
  description: "Fast, photoreal image generation.",
  assetTypes: ["image"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["image"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:5", "3:4"],
    maxBatch: 4,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsImageToVideo: false,
  },
};
