/**
 * AI Studio Shell — region & module configuration (Sprint 63I).
 *
 * The shell is DRIVEN BY THIS CONFIG, never by hardcoded layout. Each region is
 * an independently replaceable slot at a fixed depth layer (L0–L4). Every future
 * Roadmap 8.0 module is reserved here as a slot inside a region, so modules can
 * mount later WITHOUT a shell redesign.
 *
 * Depth layers (HIG / Constitution Art. VII):
 *   L0 Environment · L1 Shell · L2 Panels · L3 AI Surfaces · L4 Floating Layers
 */

export type ShellDepth = "L0" | "L1" | "L2" | "L3" | "L4";

/** The five shell regions + the floating overlay mount. */
export type StudioRegionId =
  | "nav" // left AI workspace navigation
  | "intent" // top global intent bar
  | "workspace" // center infinite workspace container
  | "activity" // right activity & approval rail
  | "dock" // bottom AI dock
  | "floating"; // L4 overlay mount (floating windows, split, palette)

/** A reserved future module — a slot a later sprint fills in. */
export interface ReservedModule {
  id: string;
  label: string;
  /** Which region this module mounts into. */
  region: StudioRegionId;
}

/** Static metadata for each region. */
export interface RegionMeta {
  id: StudioRegionId;
  depth: ShellDepth;
  label: string;
  /** Whether the region can be collapsed/hidden by the user. */
  collapsible: boolean;
  /** Reserved for future "pop out into a floating window" capability. */
  detachable: boolean;
}

export const REGION_META: Record<StudioRegionId, RegionMeta> = {
  nav: { id: "nav", depth: "L1", label: "Workspace", collapsible: true, detachable: false },
  intent: { id: "intent", depth: "L3", label: "Intent", collapsible: false, detachable: false },
  workspace: { id: "workspace", depth: "L1", label: "Workspace", collapsible: false, detachable: true },
  activity: { id: "activity", depth: "L2", label: "Activity", collapsible: true, detachable: true },
  dock: { id: "dock", depth: "L3", label: "AI Dock", collapsible: true, detachable: true },
  floating: { id: "floating", depth: "L4", label: "Floating", collapsible: false, detachable: false },
};

/**
 * Every future Roadmap 8.0 module reserved as a slot. The shell renders empty,
 * labelled placeholders for these now; later sprints replace the placeholder
 * with the real module — no shell change required.
 */
export const RESERVED_MODULES: ReservedModule[] = [
  // Center workspace
  { id: "infinite-canvas", label: "Infinite Canvas", region: "workspace" },
  { id: "prompt-workspace", label: "Prompt Workspace", region: "workspace" },
  { id: "creative-timeline", label: "Creative Timeline", region: "workspace" },
  { id: "realtime-collaboration", label: "Real-time Collaboration", region: "workspace" },
  // Right rail
  { id: "activity-stream", label: "Activity Stream", region: "activity" },
  { id: "approval-workflow", label: "Approval Workflow", region: "activity" },
  { id: "version-history", label: "Version History", region: "activity" },
  { id: "asset-inspector", label: "Asset Inspector", region: "activity" },
  { id: "brand-knowledge", label: "Brand Knowledge", region: "activity" },
  { id: "workspace-memory", label: "Workspace Memory", region: "activity" },
  { id: "ai-employees", label: "AI Employees", region: "activity" },
  // Bottom dock
  { id: "live-generation-queue", label: "Live Generation Queue", region: "dock" },
  { id: "multi-provider-generation", label: "Multi-provider Generation", region: "dock" },
  // Top intent
  { id: "command-palette", label: "Command Palette", region: "intent" },
  { id: "notifications", label: "Notifications", region: "intent" },
];

/** Reserved modules that mount into a given region (for placeholder rendering). */
export function reservedModulesFor(region: StudioRegionId): ReservedModule[] {
  return RESERVED_MODULES.filter((m) => m.region === region);
}
