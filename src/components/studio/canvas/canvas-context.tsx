"use client";

/**
 * Infinite Creative Canvas — state management (Sprint 63E).
 *
 * A single reducer owns canvas state: workspace tabs (each with its own viewport
 * + nodes), the active tool, and the selection. Pure reducer + thin action
 * helpers; no I/O, no business logic.
 *
 * Future seams (no logic yet): `CanvasHooks` lets later sprints observe presence
 * (collaboration), comments, and AI-employee actions without changing the canvas.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import {
  DEFAULT_VIEWPORT,
  zoomAt,
  type CanvasTab,
  type CanvasTool,
  type Viewport,
} from "./canvas-model";

/* ── Future extension seams (intentionally unused this sprint) ─────────────── */
export interface CanvasHooks {
  /** Real-time collaboration presence (cursors/selections) — future. */
  onPresence?: (tabId: string) => void;
  /** Comment threads pinned to nodes/points — future. */
  onComment?: (nodeId: string | null) => void;
  /** AI employees acting on the canvas — future. */
  onEmployeeAction?: (action: string) => void;
}

/* ── State + actions ──────────────────────────────────────────────────────── */
interface CanvasState {
  tabs: CanvasTab[];
  activeTabId: string;
  tool: CanvasTool;
  selectedIds: string[];
}

type Action =
  | { type: "SET_VIEWPORT"; viewport: Viewport }
  | { type: "PAN"; dx: number; dy: number }
  | { type: "ZOOM_AT"; factor: number; px: number; py: number }
  | { type: "SET_TOOL"; tool: CanvasTool }
  | { type: "SELECT"; id: string; additive: boolean }
  | { type: "CLEAR_SELECTION" }
  | { type: "MOVE_NODE"; id: string; dx: number; dy: number }
  | { type: "SWITCH_TAB"; id: string }
  | { type: "ADD_TAB" }
  | { type: "CLOSE_TAB"; id: string };

function mapActiveTab(
  state: CanvasState,
  fn: (tab: CanvasTab) => CanvasTab
): CanvasTab[] {
  return state.tabs.map((t) => (t.id === state.activeTabId ? fn(t) : t));
}

function reducer(state: CanvasState, action: Action): CanvasState {
  switch (action.type) {
    case "SET_VIEWPORT":
      return { ...state, tabs: mapActiveTab(state, (t) => ({ ...t, viewport: action.viewport })) };
    case "PAN":
      return {
        ...state,
        tabs: mapActiveTab(state, (t) => ({
          ...t,
          viewport: { ...t.viewport, x: t.viewport.x + action.dx, y: t.viewport.y + action.dy },
        })),
      };
    case "ZOOM_AT":
      return {
        ...state,
        tabs: mapActiveTab(state, (t) => ({
          ...t,
          viewport: zoomAt(t.viewport, action.factor, action.px, action.py),
        })),
      };
    case "SET_TOOL":
      return { ...state, tool: action.tool };
    case "SELECT":
      return {
        ...state,
        selectedIds: action.additive
          ? state.selectedIds.includes(action.id)
            ? state.selectedIds.filter((id) => id !== action.id)
            : [...state.selectedIds, action.id]
          : [action.id],
      };
    case "CLEAR_SELECTION":
      return state.selectedIds.length === 0 ? state : { ...state, selectedIds: [] };
    case "MOVE_NODE":
      return {
        ...state,
        tabs: mapActiveTab(state, (t) => ({
          ...t,
          nodes: t.nodes.map((n) =>
            n.id === action.id ? { ...n, x: n.x + action.dx, y: n.y + action.dy } : n
          ),
        })),
      };
    case "SWITCH_TAB":
      return state.tabs.some((t) => t.id === action.id)
        ? { ...state, activeTabId: action.id, selectedIds: [] }
        : state;
    case "ADD_TAB": {
      const id = `tab-${Date.now()}`;
      const tab: CanvasTab = {
        id,
        name: `Canvas ${state.tabs.length + 1}`,
        viewport: { ...DEFAULT_VIEWPORT },
        nodes: [],
      };
      return { ...state, tabs: [...state.tabs, tab], activeTabId: id, selectedIds: [] };
    }
    case "CLOSE_TAB": {
      if (state.tabs.length <= 1) return state; // always keep one
      const tabs = state.tabs.filter((t) => t.id !== action.id);
      const activeTabId =
        action.id === state.activeTabId ? tabs[0].id : state.activeTabId;
      return { ...state, tabs, activeTabId, selectedIds: [] };
    }
    default:
      return state;
  }
}

/* ── Context ──────────────────────────────────────────────────────────────── */
interface CanvasContextValue {
  state: CanvasState;
  activeTab: CanvasTab;
  setViewport: (viewport: Viewport) => void;
  pan: (dx: number, dy: number) => void;
  zoomAtPoint: (factor: number, px: number, py: number) => void;
  zoomBy: (factor: number, container: { width: number; height: number }) => void;
  setTool: (tool: CanvasTool) => void;
  select: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  moveNode: (id: string, dx: number, dy: number) => void;
  switchTab: (id: string) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({
  children,
  initialTabs,
}: {
  children: React.ReactNode;
  initialTabs: CanvasTab[];
  /** Future seams (collaboration/comments/employees) — accepted but unused. */
  hooks?: CanvasHooks;
}) {
  const [state, dispatch] = useReducer(reducer, {
    tabs: initialTabs,
    activeTabId: initialTabs[0].id,
    tool: "select",
    selectedIds: [],
  });

  const activeTab = useMemo(
    () => state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0],
    [state.tabs, state.activeTabId]
  );

  const setViewport = useCallback((viewport: Viewport) => dispatch({ type: "SET_VIEWPORT", viewport }), []);
  const pan = useCallback((dx: number, dy: number) => dispatch({ type: "PAN", dx, dy }), []);
  const zoomAtPoint = useCallback(
    (factor: number, px: number, py: number) => dispatch({ type: "ZOOM_AT", factor, px, py }),
    []
  );
  const zoomBy = useCallback(
    (factor: number, container: { width: number; height: number }) =>
      dispatch({ type: "ZOOM_AT", factor, px: container.width / 2, py: container.height / 2 }),
    []
  );
  const setTool = useCallback((tool: CanvasTool) => dispatch({ type: "SET_TOOL", tool }), []);
  const select = useCallback((id: string, additive = false) => dispatch({ type: "SELECT", id, additive }), []);
  const clearSelection = useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), []);
  const moveNode = useCallback((id: string, dx: number, dy: number) => dispatch({ type: "MOVE_NODE", id, dx, dy }), []);
  const switchTab = useCallback((id: string) => dispatch({ type: "SWITCH_TAB", id }), []);
  const addTab = useCallback(() => dispatch({ type: "ADD_TAB" }), []);
  const closeTab = useCallback((id: string) => dispatch({ type: "CLOSE_TAB", id }), []);

  const value = useMemo<CanvasContextValue>(
    () => ({
      state,
      activeTab,
      setViewport,
      pan,
      zoomAtPoint,
      zoomBy,
      setTool,
      select,
      clearSelection,
      moveNode,
      switchTab,
      addTab,
      closeTab,
    }),
    [state, activeTab, setViewport, pan, zoomAtPoint, zoomBy, setTool, select, clearSelection, moveNode, switchTab, addTab, closeTab]
  );

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within a CanvasProvider");
  return ctx;
}
