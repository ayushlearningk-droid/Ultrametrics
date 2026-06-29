"use client";

/**
 * Creative Workflow Engine — state management (Sprint 63F).
 *
 * A single reducer owns the graph: workspace tabs (viewport + nodes + edges),
 * tool, selection, undo/redo history, and a clipboard. Pure reducer + thin
 * action helpers; no I/O, no business logic.
 *
 * History model: undo/redo operates on the ACTIVE tab's document (nodes+edges).
 * Discrete edits snapshot automatically; drag sequences snapshot once via
 * pushHistory(). Viewport/selection/tool are transient (non-undoable). History
 * resets on tab switch/add/close.
 *
 * Future seams (no logic yet): CanvasHooks (collaboration/comments/employees)
 * and the property/AI-inspector panels read selection from here.
 */

import { createContext, useContext, useMemo, useReducer } from "react";
import {
  DEFAULT_VIEWPORT,
  snapToGrid,
  zoomAt,
  type CanvasEdge,
  type CanvasNode,
  type CanvasTab,
  type CanvasTool,
  type Viewport,
} from "./canvas-model";
import type { NodeStatus } from "./node-types";
import {
  addEdge as addEdgePure,
  pruneEdges,
  autoLayout as autoLayoutPure,
  duplicateNodes,
} from "./workflow-model";

export interface CanvasHooks {
  onPresence?: (tabId: string) => void;
  onComment?: (nodeId: string | null) => void;
  onEmployeeAction?: (action: string) => void;
}

interface TabDoc {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface CanvasState {
  tabs: CanvasTab[];
  activeTabId: string;
  tool: CanvasTool;
  selectedIds: string[];
  past: TabDoc[];
  future: TabDoc[];
  clipboard: TabDoc | null;
}

type Action =
  | { type: "SET_VIEWPORT"; viewport: Viewport }
  | { type: "PAN"; dx: number; dy: number }
  | { type: "ZOOM_AT"; factor: number; px: number; py: number }
  | { type: "SET_TOOL"; tool: CanvasTool }
  | { type: "SELECT"; id: string; additive: boolean }
  | { type: "SET_SELECTION"; ids: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "PUSH_HISTORY" }
  | { type: "MOVE_SELECTED"; dx: number; dy: number }
  | { type: "SNAP_SELECTED" }
  | { type: "ADD_NODE"; node: CanvasNode }
  | { type: "ADD_EDGE"; source: string; target: string }
  | { type: "DELETE_SELECTED" }
  | { type: "DUPLICATE_SELECTED"; seed: string }
  | { type: "COPY" }
  | { type: "PASTE"; seed: string }
  | { type: "SET_STATUS"; id: string; status: NodeStatus }
  | { type: "AUTO_LAYOUT" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SWITCH_TAB"; id: string }
  | { type: "ADD_TAB" }
  | { type: "CLOSE_TAB"; id: string };

const PASTE_OFFSET = 32;

function activeTabOf(state: CanvasState): CanvasTab {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0];
}

function withActiveTab(state: CanvasState, fn: (t: CanvasTab) => CanvasTab): CanvasTab[] {
  return state.tabs.map((t) => (t.id === state.activeTabId ? fn(t) : t));
}

/** Apply a document edit to the active tab, snapshotting history first. */
function mutateDoc(
  state: CanvasState,
  fn: (doc: TabDoc) => Partial<TabDoc>,
  nextSelection?: string[]
): CanvasState {
  const tab = activeTabOf(state);
  const snapshot: TabDoc = { nodes: tab.nodes, edges: tab.edges };
  const patch = fn(snapshot);
  return {
    ...state,
    past: [...state.past, snapshot],
    future: [],
    tabs: withActiveTab(state, (t) => ({
      ...t,
      nodes: patch.nodes ?? t.nodes,
      edges: patch.edges ?? t.edges,
    })),
    selectedIds: nextSelection ?? state.selectedIds,
  };
}

function reducer(state: CanvasState, action: Action): CanvasState {
  switch (action.type) {
    /* ── Transient (non-undoable) ── */
    case "SET_VIEWPORT":
      return { ...state, tabs: withActiveTab(state, (t) => ({ ...t, viewport: action.viewport })) };
    case "PAN":
      return {
        ...state,
        tabs: withActiveTab(state, (t) => ({
          ...t,
          viewport: { ...t.viewport, x: t.viewport.x + action.dx, y: t.viewport.y + action.dy },
        })),
      };
    case "ZOOM_AT":
      return {
        ...state,
        tabs: withActiveTab(state, (t) => ({ ...t, viewport: zoomAt(t.viewport, action.factor, action.px, action.py) })),
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
    case "SET_SELECTION":
      return { ...state, selectedIds: action.ids };
    case "CLEAR_SELECTION":
      return state.selectedIds.length === 0 ? state : { ...state, selectedIds: [] };
    case "SET_STATUS":
      // Runtime-ish; non-undoable.
      return {
        ...state,
        tabs: withActiveTab(state, (t) => ({
          ...t,
          nodes: t.nodes.map((n) => (n.id === action.id ? { ...n, status: action.status } : n)),
        })),
      };

    /* ── History snapshot for a drag sequence ── */
    case "PUSH_HISTORY": {
      const tab = activeTabOf(state);
      return { ...state, past: [...state.past, { nodes: tab.nodes, edges: tab.edges }], future: [] };
    }
    case "MOVE_SELECTED": {
      const sel = new Set(state.selectedIds);
      return {
        ...state,
        tabs: withActiveTab(state, (t) => ({
          ...t,
          nodes: t.nodes.map((n) => (sel.has(n.id) ? { ...n, x: n.x + action.dx, y: n.y + action.dy } : n)),
        })),
      };
    }
    case "SNAP_SELECTED": {
      const sel = new Set(state.selectedIds);
      return {
        ...state,
        tabs: withActiveTab(state, (t) => ({
          ...t,
          nodes: t.nodes.map((n) => (sel.has(n.id) ? { ...n, x: snapToGrid(n.x), y: snapToGrid(n.y) } : n)),
        })),
      };
    }

    /* ── Undoable document edits ── */
    case "ADD_NODE":
      return mutateDoc(state, (d) => ({ nodes: [...d.nodes, action.node] }), [action.node.id]);
    case "ADD_EDGE":
      return mutateDoc(state, (d) => ({ edges: addEdgePure(d.nodes, d.edges, action.source, action.target) }));
    case "DELETE_SELECTED": {
      if (state.selectedIds.length === 0) return state;
      const sel = new Set(state.selectedIds);
      return mutateDoc(
        state,
        (d) => ({ nodes: d.nodes.filter((n) => !sel.has(n.id)), edges: pruneEdges(d.edges, sel) }),
        []
      );
    }
    case "DUPLICATE_SELECTED": {
      if (state.selectedIds.length === 0) return state;
      const dup = (d: TabDoc) =>
        duplicateNodes(d.nodes, d.edges, state.selectedIds, { dx: PASTE_OFFSET, dy: PASTE_OFFSET }, action.seed);
      const tab = activeTabOf(state);
      const r = dup({ nodes: tab.nodes, edges: tab.edges });
      return mutateDoc(
        state,
        (d) => ({ nodes: [...d.nodes, ...r.nodes], edges: [...d.edges, ...r.edges] }),
        r.newIds
      );
    }
    case "COPY": {
      if (state.selectedIds.length === 0) return state;
      const tab = activeTabOf(state);
      const sel = new Set(state.selectedIds);
      return {
        ...state,
        clipboard: {
          nodes: tab.nodes.filter((n) => sel.has(n.id)),
          edges: tab.edges.filter((e) => sel.has(e.source) && sel.has(e.target)),
        },
      };
    }
    case "PASTE": {
      if (!state.clipboard || state.clipboard.nodes.length === 0) return state;
      const ids = state.clipboard.nodes.map((n) => n.id);
      const r = duplicateNodes(
        state.clipboard.nodes,
        state.clipboard.edges,
        ids,
        { dx: PASTE_OFFSET, dy: PASTE_OFFSET },
        action.seed
      );
      return mutateDoc(
        state,
        (d) => ({ nodes: [...d.nodes, ...r.nodes], edges: [...d.edges, ...r.edges] }),
        r.newIds
      );
    }
    case "AUTO_LAYOUT":
      return mutateDoc(state, (d) => ({ nodes: autoLayoutPure(d.nodes, d.edges) }));

    /* ── Undo / redo ── */
    case "UNDO": {
      if (state.past.length === 0) return state;
      const tab = activeTabOf(state);
      const current: TabDoc = { nodes: tab.nodes, edges: tab.edges };
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        past: state.past.slice(0, -1),
        future: [current, ...state.future],
        tabs: withActiveTab(state, (t) => ({ ...t, nodes: previous.nodes, edges: previous.edges })),
        selectedIds: [],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const tab = activeTabOf(state);
      const current: TabDoc = { nodes: tab.nodes, edges: tab.edges };
      const next = state.future[0];
      return {
        ...state,
        past: [...state.past, current],
        future: state.future.slice(1),
        tabs: withActiveTab(state, (t) => ({ ...t, nodes: next.nodes, edges: next.edges })),
        selectedIds: [],
      };
    }

    /* ── Tabs (reset history) ── */
    case "SWITCH_TAB":
      return state.tabs.some((t) => t.id === action.id)
        ? { ...state, activeTabId: action.id, selectedIds: [], past: [], future: [] }
        : state;
    case "ADD_TAB": {
      const id = `tab-${Date.now()}`;
      const tab: CanvasTab = { id, name: `Canvas ${state.tabs.length + 1}`, viewport: { ...DEFAULT_VIEWPORT }, nodes: [], edges: [] };
      return { ...state, tabs: [...state.tabs, tab], activeTabId: id, selectedIds: [], past: [], future: [] };
    }
    case "CLOSE_TAB": {
      if (state.tabs.length <= 1) return state;
      const tabs = state.tabs.filter((t) => t.id !== action.id);
      const activeTabId = action.id === state.activeTabId ? tabs[0].id : state.activeTabId;
      return { ...state, tabs, activeTabId, selectedIds: [], past: [], future: [] };
    }
    default:
      return state;
  }
}

interface CanvasContextValue {
  state: CanvasState;
  activeTab: CanvasTab;
  canUndo: boolean;
  canRedo: boolean;
  setViewport: (v: Viewport) => void;
  pan: (dx: number, dy: number) => void;
  zoomAtPoint: (factor: number, px: number, py: number) => void;
  zoomBy: (factor: number, c: { width: number; height: number }) => void;
  setTool: (tool: CanvasTool) => void;
  select: (id: string, additive?: boolean) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  pushHistory: () => void;
  moveSelected: (dx: number, dy: number) => void;
  snapSelected: () => void;
  addNode: (node: CanvasNode) => void;
  connect: (source: string, target: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copy: () => void;
  paste: () => void;
  setStatus: (id: string, status: NodeStatus) => void;
  autoLayout: () => void;
  undo: () => void;
  redo: () => void;
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
  hooks?: CanvasHooks;
}) {
  const [state, dispatch] = useReducer(reducer, {
    tabs: initialTabs,
    activeTabId: initialTabs[0].id,
    tool: "select",
    selectedIds: [],
    past: [],
    future: [],
    clipboard: null,
  });

  const activeTab = useMemo(() => activeTabOf(state), [state]);

  const value = useMemo<CanvasContextValue>(() => {
    const seed = () => `${Date.now().toString(36)}`;
    return {
      state,
      activeTab,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      setViewport: (viewport) => dispatch({ type: "SET_VIEWPORT", viewport }),
      pan: (dx, dy) => dispatch({ type: "PAN", dx, dy }),
      zoomAtPoint: (factor, px, py) => dispatch({ type: "ZOOM_AT", factor, px, py }),
      zoomBy: (factor, c) => dispatch({ type: "ZOOM_AT", factor, px: c.width / 2, py: c.height / 2 }),
      setTool: (tool) => dispatch({ type: "SET_TOOL", tool }),
      select: (id, additive = false) => dispatch({ type: "SELECT", id, additive }),
      setSelection: (ids) => dispatch({ type: "SET_SELECTION", ids }),
      clearSelection: () => dispatch({ type: "CLEAR_SELECTION" }),
      pushHistory: () => dispatch({ type: "PUSH_HISTORY" }),
      moveSelected: (dx, dy) => dispatch({ type: "MOVE_SELECTED", dx, dy }),
      snapSelected: () => dispatch({ type: "SNAP_SELECTED" }),
      addNode: (node) => dispatch({ type: "ADD_NODE", node }),
      connect: (source, target) => dispatch({ type: "ADD_EDGE", source, target }),
      deleteSelected: () => dispatch({ type: "DELETE_SELECTED" }),
      duplicateSelected: () => dispatch({ type: "DUPLICATE_SELECTED", seed: seed() }),
      copy: () => dispatch({ type: "COPY" }),
      paste: () => dispatch({ type: "PASTE", seed: seed() }),
      setStatus: (id, status) => dispatch({ type: "SET_STATUS", id, status }),
      autoLayout: () => dispatch({ type: "AUTO_LAYOUT" }),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
      switchTab: (id) => dispatch({ type: "SWITCH_TAB", id }),
      addTab: () => dispatch({ type: "ADD_TAB" }),
      closeTab: (id) => dispatch({ type: "CLOSE_TAB", id }),
    };
  }, [state, activeTab]);

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within a CanvasProvider");
  return ctx;
}
