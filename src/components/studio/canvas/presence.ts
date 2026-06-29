/**
 * Living Canvas — presence foundation (Sprint 63G).
 *
 * Types + a reserved demo roster for floating AI cursors. No realtime backend,
 * no collaboration logic — this is the architecture future presence (human +
 * AI employees) plugs into. World coordinates so cursors live in the space.
 */

export interface AIPresence {
  id: string;
  name: string;
  role: string;
  /** World position of the cursor. */
  x: number;
  y: number;
}

/** Reserved demo presence (idle) — replaced by live presence later. */
export const DEMO_PRESENCE: AIPresence[] = [
  { id: "p-director", name: "Director", role: "Creative", x: 540, y: 64 },
  { id: "p-editor", name: "Editor", role: "Media", x: 900, y: 380 },
];

/** Future seam: spatial audio cues tied to nodes/presence (no logic yet). */
export interface SpatialAudioHook {
  onSpatialCue?: (nodeId: string) => void;
}
