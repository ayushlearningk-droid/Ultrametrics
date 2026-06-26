/** Pika — video provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const pikaProvider: GenerationProvider = {
  id: "pika",
  name: "Pika",
  vendor: "Pika",
  description: "Stylized short-form text- and image-to-video.",
  assetTypes: ["video"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["video"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxDurationSec: 5,
    maxBatch: 1,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsImageToVideo: true,
  },
};
