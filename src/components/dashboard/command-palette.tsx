"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Plug,
  RefreshCw,
  Search,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  group: "navigate" | "action";
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allCommands: Command[] = [
    {
      id: "nav-overview",
      label: "Overview",
      description: "Dashboard mission control",
      icon: LayoutDashboard,
      group: "navigate",
      action: () => router.push("/dashboard"),
    },
    {
      id: "nav-connectors",
      label: "Connectors",
      description: "Manage data sources",
      icon: Plug,
      group: "navigate",
      action: () => router.push("/dashboard/connectors"),
    },
    {
      id: "nav-sync-jobs",
      label: "Sync Jobs",
      description: "View pipeline history",
      icon: RefreshCw,
      group: "navigate",
      action: () => router.push("/dashboard/sync-jobs"),
    },
    {
      id: "nav-billing",
      label: "Billing",
      description: "Plans and invoices",
      icon: CreditCard,
      group: "navigate",
      action: () => router.push("/dashboard/billing"),
    },
    {
      id: "nav-settings",
      label: "Settings",
      description: "Workspace preferences",
      icon: Settings,
      group: "navigate",
      action: () => router.push("/dashboard/settings"),
    },
    {
      id: "action-connect-meta",
      label: "Connect Meta Ads",
      description: "Link a Meta ad account",
      icon: BarChart3,
      group: "action",
      action: () => router.push("/dashboard/connectors/meta"),
    },
    {
      id: "action-connect-google",
      label: "Connect Google Sheets",
      description: "Set up your data destination",
      icon: ExternalLink,
      group: "action",
      action: () => router.push("/dashboard/connectors/google"),
    },
    {
      id: "action-connect-google-ads",
      label: "Connect Google Ads",
      description: "Sync campaign performance",
      icon: BarChart3,
      group: "action",
      action: () => router.push("/dashboard/connectors/google-ads"),
    },
  ];

  const filtered = query.trim()
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  const run = useCallback(
    (cmd: Command) => {
      cmd.action();
      onClose();
      setQuery("");
      setActiveIdx(0);
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIdx];
        if (cmd) run(cmd);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIdx, run, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const navCmds = filtered.filter((c) => c.group === "navigate");
  const actionCmds = filtered.filter((c) => c.group === "action");

  function renderGroup(cmds: Command[], heading: string) {
    if (!cmds.length) return null;
    const startIdx = filtered.indexOf(cmds[0]);
    return (
      <li>
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {heading}
        </p>
        <ul>
          {cmds.map((cmd, localI) => {
            const globalI = startIdx + localI;
            const Icon = cmd.icon;
            return (
              <li key={cmd.id}>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    globalI === activeIdx
                      ? "bg-brand/10 text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  )}
                  onMouseEnter={() => setActiveIdx(globalI)}
                  onClick={() => run(cmd)}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      globalI === activeIdx
                        ? "border-brand/30 bg-brand/10 text-brand"
                        : "border-white/[0.08] bg-white/[0.04] text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {cmd.label}
                    </p>
                    {cmd.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {cmd.description}
                      </p>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <kbd className="shrink-0 rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </li>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed left-1/2 top-[20%] z-[70] w-full max-w-lg -translate-x-1/2"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[hsl(222_44%_6%)] shadow-2xl shadow-black/60">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands and pages…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={onClose}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Commands list */}
              <ul
                ref={listRef}
                className="max-h-80 overflow-y-auto p-1.5 pb-2"
              >
                {filtered.length === 0 ? (
                  <li className="flex h-20 items-center justify-center">
                    <p className="text-sm text-muted-foreground/60">
                      No results for &ldquo;{query}&rdquo;
                    </p>
                  </li>
                ) : (
                  <>
                    {renderGroup(navCmds, "Navigate")}
                    {renderGroup(actionCmds, "Actions")}
                  </>
                )}
              </ul>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-white/[0.06] px-4 py-2">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1 py-0.5 font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1 py-0.5 font-mono">↵</kbd>
                  open
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
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
