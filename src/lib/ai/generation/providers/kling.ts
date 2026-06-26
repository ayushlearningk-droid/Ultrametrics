/** Kling — video provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const klingProvider: GenerationProvider = {
  id: "kling",
  name: "Kling",
  vendor: "Kuaishou",
  description: "Cinematic text- and image-to-video generation.",
  assetTypes: ["video"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["video"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxDurationSec: 10,
    maxBatch: 1,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsImageToVideo: true,
  },
};
