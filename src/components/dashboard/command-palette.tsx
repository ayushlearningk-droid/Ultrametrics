"use client";

/**
 * Command Center (Sprint 21) — the operating-system command palette.
 *
 * Universal, ranked command surface across every dashboard area (AI · Pages ·
 * Actions · Settings · Workspaces) with keyword search, an AI "Ask" fallback,
 * recent + pinned commands (localStorage), and full keyboard navigation. Reuses
 * the existing palette shell, motion.ts (fadeIn/settle), and design tokens. No
 * backend or DB changes — workspace switching reuses the existing cookie path.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { fadeIn, settle } from "@/lib/motion";
import {
  BarChart3,
  Building2,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Clock3,
  X,
} from "lucide-react";
import { useAsk } from "@/components/os/ask-provider";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types/database";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  workspaces?: Workspace[];
  currentWorkspaceId?: string;
}

type CommandGroup = "ai" | "page" | "action" | "setting" | "workspace";
type Bucket = "pinned" | "recent" | CommandGroup;

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  keywords?: string[];
  group: CommandGroup;
  action: () => void;
}

const ASK_FALLBACK_ID = "ai-ask-fallback";
const RECENT_KEY = "um:cmd:recent:v1";
const PINNED_KEY = "um:cmd:pinned:v1";
const MAX_RECENT = 6;

const BUCKET_ORDER: Bucket[] = [
  "pinned",
  "recent",
  "ai",
  "page",
  "action",
  "setting",
  "workspace",
];
const BUCKET_LABEL: Record<Bucket, string> = {
  pinned: "Pinned",
  recent: "Recent",
  ai: "AI Commands",
  page: "Pages",
  action: "Actions",
  setting: "Settings",
  workspace: "Workspaces",
};

/** Keyword/label match score; 0 = no match (filtered out). */
function score(cmd: Command, q: string): number {
  const label = cmd.label.toLowerCase();
  if (label.startsWith(q)) return 100;
  if (label.includes(q)) return 60;
  if ((cmd.keywords ?? []).join(" ").toLowerCase().includes(q)) return 40;
  if ((cmd.description ?? "").toLowerCase().includes(q)) return 20;
  return 0;
}

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function CommandPalette({
  open,
  onClose,
  workspaces = [],
  currentWorkspaceId,
}: CommandPaletteProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { open: openAsk, send, newChat, focusSearch, focusComposer } = useAsk();

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Load persisted recent/pinned on mount (client only).
  useEffect(() => {
    setRecentIds(readIds(RECENT_KEY));
    setPinnedIds(readIds(PINNED_KEY));
  }, []);

  const goto = useCallback(
    (href: string) => router.push(href),
    [router]
  );

  const switchWorkspace = useCallback(
    (id: string) => {
      document.cookie = `workspace_id=${id};path=/;max-age=31536000;SameSite=Lax`;
      router.refresh();
    },
    [router]
  );

  // ── Universal command registry (covers every surface) ──
  const registry = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      // AI
      {
        id: "ai-open-ask",
        label: "Ask AI",
        description: "Ask Ultrametrics anything",
        icon: Sparkles,
        shortcut: "A",
        keywords: ["chat", "assistant", "question"],
        group: "ai",
        action: () => openAsk(),
      },
      {
        id: "ai-new-conversation",
        label: "New Conversation",
        description: "Start a fresh chat",
        icon: Plus,
        shortcut: "N",
        keywords: ["chat", "reset"],
        group: "ai",
        action: () => {
          openAsk();
          newChat();
        },
      },
      {
        id: "ai-search-conversations",
        label: "Search Conversations",
        description: "Find a past chat",
        icon: Search,
        shortcut: "/",
        keywords: ["history", "threads"],
        group: "ai",
        action: () => {
          openAsk();
          focusSearch();
        },
      },
      {
        id: "ai-focus-composer",
        label: "Focus Composer",
        description: "Jump to the Ask input",
        icon: MessageSquare,
        shortcut: "Shift+A",
        group: "ai",
        action: () => {
          openAsk();
          focusComposer();
        },
      },
      {
        id: "ai-search-campaign",
        label: "Search Campaign",
        description: "Ask the AI about your campaigns",
        icon: BarChart3,
        keywords: ["ads", "performance"],
        group: "ai",
        action: () => {
          openAsk();
          void send("Show my campaigns so I can search and compare them.");
        },
      },
      // Pages
      {
        id: "page-overview",
        label: "Open Morning Brief",
        description: "Executive dashboard",
        icon: LayoutDashboard,
        keywords: ["home", "overview", "dashboard"],
        group: "page",
        action: () => goto("/dashboard"),
      },
      {
        id: "page-reports",
        label: "Create Report",
        description: "Open the AI report",
        icon: FileText,
        keywords: ["report", "export", "pdf"],
        group: "page",
        action: () => goto("/dashboard/reports"),
      },
      {
        id: "page-creative-studio",
        label: "Creative Studio",
        description: "AI creative brief, hooks & storyboard",
        icon: Sparkles,
        keywords: ["creative", "hooks", "copy", "ad", "storyboard"],
        group: "page",
        action: () => goto("/dashboard/creative-studio"),
      },
      {
        id: "page-media-buyer",
        label: "Media Buyer",
        description: "AI optimization plan (budget · audience · scaling)",
        icon: BarChart3,
        keywords: ["media buyer", "optimize", "budget", "scaling", "plan"],
        group: "page",
        action: () => goto("/dashboard/media-buyer"),
      },
      {
        id: "page-actions",
        label: "Open Action Queue",
        description: "Approved actions & executions",
        icon: ListChecks,
        keywords: ["actions", "execute", "rollback"],
        group: "page",
        action: () => goto("/dashboard/actions"),
      },
      {
        id: "page-timeline",
        label: "Go to Timeline",
        description: "Recent activity",
        icon: Clock3,
        keywords: ["history", "events"],
        group: "page",
        action: () => goto("/dashboard/timeline"),
      },
      {
        id: "page-connectors",
        label: "Connectors",
        description: "Manage data sources",
        icon: Plug,
        keywords: ["sources", "integrations"],
        group: "page",
        action: () => goto("/dashboard/connectors"),
      },
      {
        id: "page-sync-jobs",
        label: "Sync Jobs",
        description: "Pipeline history",
        icon: RefreshCw,
        keywords: ["pipeline", "runs"],
        group: "page",
        action: () => goto("/dashboard/sync-jobs"),
      },
      {
        id: "page-billing",
        label: "Billing",
        description: "Plans and invoices",
        icon: CreditCard,
        group: "page",
        action: () => goto("/dashboard/billing"),
      },
      // Actions
      {
        id: "action-connect-meta",
        label: "Connect Meta Ads",
        description: "Link a Meta ad account",
        icon: BarChart3,
        keywords: ["facebook", "source"],
        group: "action",
        action: () => goto("/dashboard/connectors/meta"),
      },
      {
        id: "action-connect-google",
        label: "Connect Google Sheets",
        description: "Set up your data destination",
        icon: ExternalLink,
        keywords: ["sheets", "destination"],
        group: "action",
        action: () => goto("/dashboard/connectors/google"),
      },
      {
        id: "action-connect-google-ads",
        label: "Connect Google Ads",
        description: "Sync campaign performance",
        icon: BarChart3,
        keywords: ["adwords", "source"],
        group: "action",
        action: () => goto("/dashboard/connectors/google-ads"),
      },
      {
        id: "action-sync-meta",
        label: "Sync Meta",
        description: "Open Meta to run a sync",
        icon: RefreshCw,
        keywords: ["refresh", "facebook"],
        group: "action",
        action: () => goto("/dashboard/connectors/meta"),
      },
      {
        id: "action-sync-google",
        label: "Sync Google",
        description: "Open Google to run a sync",
        icon: RefreshCw,
        keywords: ["refresh", "sheets"],
        group: "action",
        action: () => goto("/dashboard/connectors/google"),
      },
      // Settings
      {
        id: "setting-workspace",
        label: "Settings",
        description: "Workspace preferences & flags",
        icon: Settings,
        shortcut: "Ctrl+,",
        keywords: ["preferences", "feature flags", "profile"],
        group: "setting",
        action: () => goto("/dashboard/settings"),
      },
    ];

    // Workspaces (real data from props) — switch to any other workspace.
    for (const ws of workspaces) {
      if (ws.id === currentWorkspaceId) continue;
      cmds.push({
        id: `workspace-${ws.id}`,
        label: `Switch to ${ws.name}`,
        description: "Workspace",
        icon: Building2,
        keywords: ["workspace", ws.name.toLowerCase()],
        group: "workspace",
        action: () => switchWorkspace(ws.id),
      });
    }
    return cmds;
  }, [
    workspaces,
    currentWorkspaceId,
    openAsk,
    send,
    newChat,
    focusSearch,
    focusComposer,
    goto,
    switchWorkspace,
  ]);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const askFallback = useCallback(
    (q: string): Command => ({
      id: ASK_FALLBACK_ID,
      label: `Ask AI: “${q}”`,
      description: "Send this to Ultrametrics",
      icon: Sparkles,
      group: "ai",
      action: () => {
        openAsk();
        void send(q);
      },
    }),
    [openAsk, send]
  );

  // ── Ranking: pinned → recent → ai → pages → actions → settings → workspaces ──
  const { ordered, hasRealMatch } = useMemo(() => {
    const q = query.trim().toLowerCase();

    const cands = registry
      .map((cmd) => ({ cmd, s: q ? score(cmd, q) : 0 }))
      .filter((x) => !q || x.s > 0);

    const realCount = cands.length;
    if (q) cands.push({ cmd: askFallback(query.trim()), s: 1 });

    const bucketOf = (cmd: Command): Bucket => {
      if (pinnedSet.has(cmd.id)) return "pinned";
      if (!q && recentIds.includes(cmd.id)) return "recent";
      return cmd.group;
    };

    const groups = new Map<Bucket, { cmd: Command; s: number }[]>();
    for (const cand of cands) {
      const b = bucketOf(cand.cmd);
      const arr = groups.get(b) ?? [];
      arr.push(cand);
      groups.set(b, arr);
    }

    const out: Command[] = [];
    for (const b of BUCKET_ORDER) {
      const arr = groups.get(b);
      if (!arr) continue;
      if (b === "recent") {
        arr.sort((a, c) => recentIds.indexOf(a.cmd.id) - recentIds.indexOf(c.cmd.id));
      } else if (q) {
        arr.sort((a, c) => c.s - a.s); // stable enough for our sizes
      }
      out.push(...arr.map((x) => x.cmd));
    }
    return { ordered: out, hasRealMatch: realCount > 0 };
  }, [query, registry, pinnedSet, recentIds, askFallback]);

  const recordRecent = useCallback((id: string) => {
    if (id === ASK_FALLBACK_ID) return;
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      writeIds(RECENT_KEY, next);
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      writeIds(PINNED_KEY, next);
      return next;
    });
  }, []);

  const run = useCallback(
    (cmd: Command) => {
      cmd.action();
      recordRecent(cmd.id);
      onClose();
      setQuery("");
      setActiveIdx(0);
    },
    [onClose, recordRecent]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Keep active index within bounds when the list changes.
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, ordered.length - 1)));
  }, [ordered.length]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (ordered.length ? (i + 1) % ordered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) =>
          ordered.length ? (i - 1 + ordered.length) % ordered.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = ordered[activeIdx];
        if (cmd) run(cmd);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, ordered, activeIdx, run, onClose]);

  // Scroll the active row into view.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, ordered]);

  const bucketForRender = (cmd: Command): Bucket => {
    if (cmd.id === ASK_FALLBACK_ID) return "ai";
    if (pinnedSet.has(cmd.id)) return "pinned";
    if (!query.trim() && recentIds.includes(cmd.id)) return "recent";
    return cmd.group;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/50"
            variants={fadeIn}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-[20%] z-[70] w-full max-w-lg -translate-x-1/2"
            variants={settle}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit="exit"
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[hsl(222_44%_6%)] shadow-2xl shadow-black/60">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
                <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search everything or ask AI…"
                  aria-label="Search commands"
                  className="flex-1 bg-transparent type-body outline-none placeholder:text-foreground-muted"
                />
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Results */}
              <ul ref={listRef} className="max-h-80 overflow-y-auto p-1.5 pb-2">
                {query.trim() && !hasRealMatch && (
                  <li className="flex flex-col items-center gap-1 px-4 pb-2 pt-5 text-center">
                    <Sparkles className="h-5 w-5 text-foreground-muted" />
                    <p className="type-caption text-foreground-muted">
                      No commands match — ask Ultrametrics instead.
                    </p>
                  </li>
                )}

                {ordered.map((cmd, i) => {
                  const bucket = bucketForRender(cmd);
                  const prevBucket =
                    i > 0 ? bucketForRender(ordered[i - 1]) : null;
                  const showHeader = bucket !== prevBucket;
                  const active = i === activeIdx;
                  const Icon = cmd.icon;
                  const pinned = pinnedSet.has(cmd.id);
                  const pinnable = cmd.id !== ASK_FALLBACK_ID;
                  return (
                    <li key={cmd.id}>
                      {showHeader && (
                        <p className="px-3 pb-1 pt-3 type-eyebrow text-foreground-muted">
                          {BUCKET_LABEL[bucket]}
                        </p>
                      )}
                      <div
                        data-active={active}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-brand/10 text-foreground"
                            : "text-foreground-muted hover:bg-white/[0.04] hover:text-foreground"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => run(cmd)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                              active
                                ? "border-brand/30 bg-brand/10 text-brand"
                                : "border-white/[0.08] bg-white/[0.04] text-foreground-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate type-body font-semibold text-foreground">
                              {cmd.label}
                            </p>
                            {cmd.description && (
                              <p className="truncate type-caption text-foreground-muted">
                                {cmd.description}
                              </p>
                            )}
                          </div>
                        </button>
                        {pinnable && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(cmd.id);
                            }}
                            aria-label={pinned ? "Unpin command" : "Pin command"}
                            aria-pressed={pinned}
                            className={cn(
                              "shrink-0 rounded-md p-1 transition-colors",
                              pinned
                                ? "text-brand"
                                : "text-foreground-muted opacity-0 hover:text-foreground group-hover:opacity-100"
                            )}
                          >
                            <Star
                              className="h-3.5 w-3.5"
                              fill={pinned ? "currentColor" : "none"}
                            />
                          </button>
                        )}
                        {cmd.shortcut && (
                          <kbd className="shrink-0 rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono type-caption text-foreground-muted">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-white/[0.06] px-4 py-2">
                <span className="flex items-center gap-1 type-caption text-foreground-muted">
                  <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1 py-0.5 font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1 type-caption text-foreground-muted">
                  <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1 py-0.5 font-mono">↵</kbd>
                  open
                </span>
                <span className="flex items-center gap-1 type-caption text-foreground-muted">
                  <Star className="h-3 w-3" />
                  pin
                </span>
                <span className="flex items-center gap-1 type-caption text-foreground-muted">
                  <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1 py-0.5 font-mono">esc</kbd>
                  close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
