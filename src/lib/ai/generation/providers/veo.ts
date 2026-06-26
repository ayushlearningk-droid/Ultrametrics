/** Veo (Google) — video provider metadata only (Sprint 52). No API calls. */
import type { GenerationProvider } from "../types";

export const veoProvider: GenerationProvider = {
  id: "veo",
  name: "Veo",
  vendor: "Google",
  description: "Google's high-fidelity text-to-video model.",
  assetTypes: ["video"],
  status: "planned",
  executionMode: "disabled",
  capability: {
    assetTypes: ["video"],
    aspectRatios: ["16:9", "9:16"],
    maxDurationSec: 8,
    maxBatch: 1,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsImageToVideo: true,
  },
};
