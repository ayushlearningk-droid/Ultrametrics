"use client";

/**
 * Ask Ultrametrics — conversation rail (Sprint 2, desktop).
 *
 * The left sidebar of the Ask drawer: header ("Conversations" + New Chat),
 * a scrollable list of ConversationRow, the active conversation highlighted,
 * plus loading and empty states. Consumes the shared Ask state via useAsk();
 * it adds no business logic of its own (its only local state is a loading flag
 * for its initial list fetch).
 *
 * Design: ~240px, dark cinematic surface, emerald accent only, minimal
 * Linear-style — no heavy blur or effects.
 */

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAsk } from "@/components/os/ask-provider";
import { ConversationRow } from "@/components/os/conversation-row";

export function ConversationRail() {
  const {
    conversations,
    conversationId,
    selectConversation,
    newChat,
    renameConversation,
    deleteConversation,
    refreshConversations,
  } = useAsk();

  // Local loading state for the rail's own initial fetch (existing method only).
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refreshConversations().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshConversations]);

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
        ) : conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="text-[12px] text-foreground-muted">
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === conversationId}
                onSelect={selectConversation}
                onRename={renameConversation}
                onDelete={deleteConversation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
