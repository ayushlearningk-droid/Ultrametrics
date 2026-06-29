/**
 * AI Studio — Canvas page (Sprint 63E).
 *
 * Renders the Infinite Creative Canvas inside the shell's Workspace Region
 * (the studio layout provides the shell). Foundation only — no AI, no
 * generation, no business logic.
 */

import { StudioCanvas } from "@/components/studio/canvas/studio-canvas";

export const metadata = { title: "Canvas · AI Studio" };

export default function StudioCanvasPage() {
  return <StudioCanvas />;
}
