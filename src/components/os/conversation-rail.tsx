"use client";

/**
 * Ask Ultrametrics — conversation rail (Sprint 2 + Sprint 5, desktop).
 *
 * Left sidebar of the Ask drawer: New Chat, a debounced search input, and the
 * conversation list grouped into Favorites (pinned) / Today / Yesterday /
 * Previous 7 Days / Earlier, plus a lazily-loaded Archived section with restore.
 * Consumes the shared Ask state via useAsk(); grouping is memoised; search is
 * debounced. Design: ~240px, dark cinematic surface, emerald accent only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useAsk } from "@/components/os/ask-provider";
import { ConversationRow } from "@/components/os/conversation-row";
import type { AiConversation } from "@/types/database";

const DAY = 86_400_000;
const SEARCH_DEBOUNCE_MS = 250;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

interface Groups {
  favorites: AiConversation[];
  today: AiConversation[];
  yesterday: AiConversation[];
  prev7: AiConversation[];
  earlier: AiConversation[];
}

/** Split into Favorites (pinned) + recency buckets by updated_at. */
function groupConversations(list: AiConversation[]): Groups {
  const todayStart = startOfDay(Date.now());
  const yStart = todayStart - DAY;
  const weekStart = todayStart - 7 * DAY;
  const g: Groups = {
    favorites: [],
    today: [],
    yesterday: [],
    prev7: [],
    earlier: [],
  };
  for (const c of list) {
    if (c.pinned_at != null) {
      g.favorites.push(c);
      continue;
    }
    const t = new Date(c.updated_at).getTime();
    if (t >= todayStart) g.today.push(c);
    else if (t >= yStart) g.yesterday.push(c);
    else if (t >= weekStart) g.prev7.push(c);
    else g.earlier.push(c);
  }
  return g;
}

export function ConversationRail() {
  const {
    conversations,
    conversationId,
    search,
    setSearch,
    selectConversation,
    newChat,
    renameConversation,
    deleteConversation,
    pinConversation,
    archiveConversation,
    restoreConversation,
    refreshConversations,
    loadArchived,
    searchFocusSignal,
  } = useAsk();

  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState<AiConversation[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initial list load (own loading flag) + debounce cleanup.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refreshConversations().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refreshConversations]);

  // Sprint 6: the `/` shortcut bumps searchFocusSignal — focus the search input.
  // Two frames so we land after the drawer's own open-focus (the composer).
  useEffect(() => {
    if (searchFocusSignal === 0) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => searchInputRef.current?.focus());
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [searchFocusSignal]);

  // Debounced search: set the query immediately (controlled input), refetch later.
  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void refreshConversations();
      }, SEARCH_DEBOUNCE_MS);
    },
    [setSearch, refreshConversations]
  );

  const groups = useMemo(
    () => groupConversations(conversations),
    [conversations]
  );

  const toggleArchived = useCallback(async () => {
    const next = !archivedOpen;
    setArchivedOpen(next);
    if (next && !archivedLoaded) {
      const a = await loadArchived();
      setArchived(a);
      setArchivedLoaded(true);
    }
  }, [archivedOpen, archivedLoaded, loadArchived]);

  const handleArchive = useCallback(
    async (id: string) => {
      await archiveConversation(id);
      // The archived set is now stale; reload it if visible, else on next open.
      if (archivedOpen) {
        const a = await loadArchived();
        setArchived(a);
        setArchivedLoaded(true);
      } else {
        setArchivedLoaded(false);
      }
    },
    [archiveConversation, archivedOpen, loadArchived]
  );

  const handleRestore = useCallback(
    async (id: string) => {
      setArchived((prev) => prev.filter((c) => c.id !== id)); // optimistic
      await restoreConversation(id); // hook refreshes the active list
    },
    [restoreConversation]
  );

  const renderSection = (label: string, items: AiConversation[]) =>
    items.length > 0 ? (
      <div key={label}>
        <div className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
          {label}
        </div>
        <div className="space-y-0.5">
          {items.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              active={c.id === conversationId}
              onSelect={selectConversation}
              onRename={renameConversation}
              onDelete={deleteConversation}
              onPin={pinConversation}
              onArchive={handleArchive}
            />
          ))}
        </div>
      </div>
    ) : null;

  const hasAny = conversations.length > 0;

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-white/[0.07]">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.07] px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
          Conversations
        </span>
        <button
          type="button"
          onClick={newChat}
          aria-label="New chat"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-brand/15 hover:text-brand"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-white/[0.06] p-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search conversations"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-foreground-muted"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && conversations.length === 0 ? (
          <div className="space-y-1.5 px-1 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-white/[0.04]"
              />
            ))}
          </div>
        ) : !hasAny ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-foreground-muted">
              {search ? `No chats match “${search}”` : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {renderSection("Favorites", groups.favorites)}
            {renderSection("Today", groups.today)}
            {renderSection("Yesterday", groups.yesterday)}
            {renderSection("Previous 7 Days", groups.prev7)}
            {renderSection("Earlier", groups.earlier)}
          </div>
        )}

        {/* Archived (lazy) */}
        <div className="mt-3 border-t border-white/[0.06] pt-2">
          <button
            type="button"
            onClick={toggleArchived}
            className="flex w-full items-center gap-1.5 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted transition-colors hover:text-foreground"
          >
            {archivedOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Archived
          </button>
          {archivedOpen && (
            <div className="mt-1 space-y-0.5">
              {archived.length === 0 ? (
                <p className="px-2 py-1 text-[11px] text-foreground-muted">
                  Nothing archived.
                </p>
              ) : (
                archived.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    active={c.id === conversationId}
                    onSelect={selectConversation}
                    onRename={renameConversation}
                    onDelete={deleteConversation}
                    onRestore={handleRestore}
                    archived
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
