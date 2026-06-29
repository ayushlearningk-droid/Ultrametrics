/**
 * AI Studio Home — section configuration (Sprint 63 · Home).
 *
 * The Home is DRIVEN BY THIS CONFIG, never hardcoded markup. Each array is an
 * extension point: future Roadmap 8.0 modules replace the placeholder data here
 * (real projects, live employees, trending ads with metrics) without changing
 * the section components. Presentation metadata only — no business logic.
 */

import {
  Video,
  Image as ImageIcon,
  Images,
  BookOpen,
  Film,
  Globe,
  Mail,
  Megaphone,
  Crown,
  Palette,
  Target,
  PenLine,
  LineChart,
  Workflow,
  Type,
  Droplet,
  Hexagon,
  Shapes,
  type LucideIcon,
} from "lucide-react";

/** A creatable output type (Create section). Entry points; inert this sprint. */
export interface CreateType {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CREATE_TYPES: CreateType[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "carousel", label: "Carousel", icon: Images },
  { id: "story", label: "Story", icon: BookOpen },
  { id: "shorts", label: "Shorts", icon: Film },
  { id: "landing-page", label: "Landing Page", icon: Globe },
  { id: "email", label: "Email", icon: Mail },
  { id: "ad-creative", label: "Ad Creative", icon: Megaphone },
];

/** An AI Employee (status placeholders only this sprint). */
export interface StudioEmployee {
  id: string;
  name: string;
  role: string;
  icon: LucideIcon;
  /** Placeholder status — real status arrives with the AI Employees module. */
  status: "Idle" | "Ready";
}

export const STUDIO_EMPLOYEES: StudioEmployee[] = [
  { id: "ceo", name: "CEO AI", role: "Orchestrator", icon: Crown, status: "Ready" },
  { id: "creative-director", name: "Creative Director", role: "Creative", icon: Palette, status: "Idle" },
  { id: "media-buyer", name: "Media Buyer", role: "Performance", icon: Target, status: "Idle" },
  { id: "copywriter", name: "Copywriter", role: "Words", icon: PenLine, status: "Idle" },
  { id: "growth-analyst", name: "Growth Analyst", role: "Insight", icon: LineChart, status: "Idle" },
  { id: "automation", name: "Automation AI", role: "Pipelines", icon: Workflow, status: "Idle" },
];

/** A Brand Workspace facet. */
export interface BrandFacet {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const BRAND_FACETS: BrandFacet[] = [
  { id: "brand-kit", label: "Brand Kit", icon: Hexagon },
  { id: "assets", label: "Assets", icon: Shapes },
  { id: "fonts", label: "Fonts", icon: Type },
  { id: "colors", label: "Colors", icon: Droplet },
  { id: "logos", label: "Logos", icon: Palette },
];

/** Placeholder slot count for autoplay-ready rails (Trending / Inspirations). */
export const RAIL_PLACEHOLDER_COUNT = 4;
