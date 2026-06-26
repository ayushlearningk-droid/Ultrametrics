/** Luma (Dream Machine) — video provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const lumaProvider: GenerationProvider = {
  id: "luma",
  name: "Luma",
  vendor: "Luma AI",
  description: "Dream Machine text- and image-to-video generation.",
  assetTypes: ["video"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["video"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxDurationSec: 5,
    maxBatch: 1,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsImageToVideo: true,
  },
};
