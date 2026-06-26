/** Runway (Gen-3) — video provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const runwayProvider: GenerationProvider = {
  id: "runway",
  name: "Runway",
  vendor: "Runway",
  description: "Text- and image-to-video generation (Gen-3).",
  assetTypes: ["video"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["video"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxDurationSec: 10,
    maxBatch: 1,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsImageToVideo: true,
  },
};
