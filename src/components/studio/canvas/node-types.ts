/**
 * Creative Workflow Engine — node type registry (Sprint 63F).
 *
 * Declarative catalog of every workflow node. The graph, palette, and renderer
 * are DRIVEN BY THIS REGISTRY — adding a future node type (or a whole pipeline
 * like Prompt-to-Video / Talking Avatar / UGC) is a registry entry, not a
 * redesign. No business logic, no providers.
 */

import {
  MessageSquare,
  LayoutPanelTop,
  Clapperboard,
  Image as ImageIcon,
  Video,
  Mic,
  Music,
  Captions,
  ImagePlus,
  Send,
  type LucideIcon,
} from "lucide-react";

export type NodeType =
  | "prompt"
  | "storyboard"
  | "scene"
  | "image"
  | "video"
  | "voice"
  | "music"
  | "caption"
  | "thumbnail"
  | "publish";

export type NodeStatus = "idle" | "running" | "complete" | "failed";

export type NodeCategory =
  | "input"
  | "compose"
  | "media"
  | "audio"
  | "text"
  | "output";

export interface NodeTypeDef {
  type: NodeType;
  label: string;
  icon: LucideIcon;
  category: NodeCategory;
  /** Single in/out ports this sprint; multi-port is a future registry extension. */
  hasInput: boolean;
  hasOutput: boolean;
  width: number;
  height: number;
}

const W = 216;
const H = 116;

export const NODE_TYPES: Record<NodeType, NodeTypeDef> = {
  prompt: { type: "prompt", label: "Prompt", icon: MessageSquare, category: "input", hasInput: false, hasOutput: true, width: W, height: H },
  storyboard: { type: "storyboard", label: "Storyboard", icon: LayoutPanelTop, category: "compose", hasInput: true, hasOutput: true, width: W, height: H },
  scene: { type: "scene", label: "Scene", icon: Clapperboard, category: "compose", hasInput: true, hasOutput: true, width: W, height: H },
  image: { type: "image", label: "Image", icon: ImageIcon, category: "media", hasInput: true, hasOutput: true, width: W, height: H },
  video: { type: "video", label: "Video", icon: Video, category: "media", hasInput: true, hasOutput: true, width: W, height: H },
  voice: { type: "voice", label: "Voice", icon: Mic, category: "audio", hasInput: true, hasOutput: true, width: W, height: H },
  music: { type: "music", label: "Music", icon: Music, category: "audio", hasInput: true, hasOutput: true, width: W, height: H },
  caption: { type: "caption", label: "Caption", icon: Captions, category: "text", hasInput: true, hasOutput: true, width: W, height: H },
  thumbnail: { type: "thumbnail", label: "Thumbnail", icon: ImagePlus, category: "media", hasInput: true, hasOutput: true, width: W, height: H },
  publish: { type: "publish", label: "Publish", icon: Send, category: "output", hasInput: true, hasOutput: false, width: W, height: H },
};

export const NODE_TYPE_LIST: NodeTypeDef[] = Object.values(NODE_TYPES);

/** Status presentation (tone maps to abstract chip tones, never raw colors). */
export const STATUS_META: Record<
  NodeStatus,
  { label: string; tone: "neutral" | "positive" | "negative" | "running" }
> = {
  idle: { label: "Idle", tone: "neutral" },
  running: { label: "Running", tone: "running" },
  complete: { label: "Complete", tone: "positive" },
  failed: { label: "Failed", tone: "negative" },
};
