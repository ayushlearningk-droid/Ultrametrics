"use client";

/**
 * Unified Workspace — region manager (Sprint 63K).
 *
 * One living workspace of dockable regions. Holds each region's zone, order,
 * collapsed/floating state, the resizable side-zone widths, and a UI-only
 * persistence layer (localStorage). No backend. Presentation/state only.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Target,
  Clapperboard,
  Users,
  Radio,
  History,
  CheckCircle2,
  LayoutGrid,
  Images,
  PanelRight,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

export type RegionId =
  | "outcome"
  | "movie"
  | "employees"
  | "activity"
  | "timeline"
  | "approval"
  | "canvas"
  | "creative"
  | "inspector"
  | "queue";

export type Zone = "left" | "center" | "right" | "float" | "hidden";

export interface FloatRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RegionState {
  id: RegionId;
  zone: Zone;
  order: number;
  collapsed: boolean;
  float: FloatRect;
}

export interface RegionDef {
  id: RegionId;
  title: string;
  icon: LucideIcon;
  defaultZone: Zone;
  defaultOrder: number;
}

/**
 * Guided defaults (Sprint 64AB): a single center column — Movie, then Gallery,
 * then Approval — revealed progressively by the Orchestrator. Every other region
 * is hidden ("advanced") until the user opts in. This replaces the floating
 * multi-panel dashboard with a linear, guided workflow.
 */
export const REGION_DEFS: RegionDef[] = [
  { id: "outcome", title: "Outcome", icon: Target, defaultZone: "hidden", defaultOrder: 0 },
  { id: "movie", title: "AI Movie", icon: Clapperboard, defaultZone: "center", defaultOrder: 0 },
  { id: "employees", title: "AI Employees", icon: Users, defaultZone: "hidden", defaultOrder: 1 },
  { id: "activity", title: "Activity", icon: Radio, defaultZone: "hidden", defaultOrder: 3 },
  { id: "timeline", title: "Timeline", icon: History, defaultZone: "hidden", defaultOrder: 4 },
  { id: "approval", title: "Approval", icon: CheckCircle2, defaultZone: "hidden", defaultOrder: 2 },
  { id: "canvas", title: "Canvas", icon: LayoutGrid, defaultZone: "hidden", defaultOrder: 5 },
  { id: "creative", title: "Creatives", icon: Images, defaultZone: "hidden", defaultOrder: 1 },
  { id: "inspector", title: "Inspector", icon: PanelRight, defaultZone: "hidden", defaultOrder: 6 },
  { id: "queue", title: "Queue", icon: ListChecks, defaultZone: "hidden", defaultOrder: 7 },
];

const STORAGE_KEY = "um:studio:workspace:v2";
const DEFAULT_LEFT_W = 320;
const DEFAULT_RIGHT_W = 340;

function defaultRegions(): RegionState[] {
  return REGION_DEFS.map((d, i) => ({
    id: d.id,
    zone: d.defaultZone,
    order: d.defaultOrder,
    collapsed: false,
    float: { x: 120 + i * 24, y: 120 + i * 24, w: 420, h: 360 },
  }));
}

interface RegionManagerValue {
  regions: RegionState[];
  leftW: number;
  rightW: number;
  /** Advanced mode (Sprint 64AB): reveals the region toolbar + advanced panels. */
  advanced: boolean;
  setAdvanced: (v: boolean) => void;
  defOf: (id: RegionId) => RegionDef;
  toggleVisible: (id: RegionId) => void;
  setZone: (id: RegionId, zone: Zone) => void;
  showRegion: (id: RegionId, zone: Zone) => void;
  toggleCollapse: (id: RegionId) => void;
  setCollapsed: (id: RegionId, collapsed: boolean) => void;
  setFloat: (id: RegionId, patch: Partial<FloatRect>) => void;
  setLeftW: (w: number) => void;
  setRightW: (w: number) => void;
  reset: () => void;
}

const RegionManagerContext = createContext<RegionManagerValue | null>(null);

export function RegionManagerProvider({ children }: { children: React.ReactNode }) {
  const [regions, setRegions] = useState<RegionState[]>(defaultRegions);
  const [leftW, setLeftWState] = useState(DEFAULT_LEFT_W);
  const [rightW, setRightWState] = useState(DEFAULT_RIGHT_W);
  const [advanced, setAdvanced] = useState(false);

  // Load persisted layout after mount (avoids hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { regions?: RegionState[]; leftW?: number; rightW?: number };
      if (Array.isArray(saved.regions) && saved.regions.length === REGION_DEFS.length) setRegions(saved.regions);
      if (typeof saved.leftW === "number") setLeftWState(saved.leftW);
      if (typeof saved.rightW === "number") setRightWState(saved.rightW);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ regions, leftW, rightW }));
    } catch {
      /* ignore */
    }
  }, [regions, leftW, rightW]);

  const defOf = useCallback((id: RegionId) => REGION_DEFS.find((d) => d.id === id)!, []);
  const patch = useCallback(
    (id: RegionId, fn: (r: RegionState) => RegionState) =>
      setRegions((prev) => prev.map((r) => (r.id === id ? fn(r) : r))),
    []
  );

  const value = useMemo<RegionManagerValue>(
    () => ({
      regions,
      leftW,
      rightW,
      advanced,
      setAdvanced,
      defOf,
      toggleVisible: (id) =>
        patch(id, (r) => (r.zone === "hidden" ? { ...r, zone: defOf(id).defaultZone } : { ...r, zone: "hidden" })),
      setZone: (id, zone) => patch(id, (r) => ({ ...r, zone })),
      showRegion: (id, zone) => patch(id, (r) => (r.zone === "hidden" ? { ...r, zone } : r)),
      toggleCollapse: (id) => patch(id, (r) => ({ ...r, collapsed: !r.collapsed })),
      setCollapsed: (id, collapsed) => patch(id, (r) => (r.collapsed === collapsed ? r : { ...r, collapsed })),
      setFloat: (id, p) => patch(id, (r) => ({ ...r, float: { ...r.float, ...p } })),
      setLeftW: (w) => setLeftWState(Math.max(240, Math.min(520, w))),
      setRightW: (w) => setRightWState(Math.max(260, Math.min(560, w))),
      reset: () => {
        setRegions(defaultRegions());
        setLeftWState(DEFAULT_LEFT_W);
        setRightWState(DEFAULT_RIGHT_W);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      },
    }),
    [regions, leftW, rightW, advanced, defOf, patch]
  );

  return <RegionManagerContext.Provider value={value}>{children}</RegionManagerContext.Provider>;
}

export function useRegions(): RegionManagerValue {
  const ctx = useContext(RegionManagerContext);
  if (!ctx) throw new Error("useRegions must be used within a RegionManagerProvider");
  return ctx;
}
