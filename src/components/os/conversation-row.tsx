"use client";

/**
 * Ask Ultrametrics — conversation row (Sprint 2).
 *
 * Presentational only: renders one conversation in the rail with an active
 * state, title, optional last-message preview, a relative timestamp, and a ⋯
 * menu (Rename / Delete). All behavior is delegated upward via callbacks; the
 * only local state is the inline-rename draft (view state, not business logic).
 *
 * Design language: dark cinematic surface, emerald accent only, minimal —
 * Linear-style row with no heavy effects.
 */

import { useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AiConversation } from "@/types/database";

export interface ConversationRowProps {
  conversation: AiConversation;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  /** Sprint 5 — optional so the rail can wire them in File 8. */
  onPin?: (id: string, pinned: boolean) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  /** When true, this is an archived row: show Restore instead of Pin/Archive. */
  archived?: boolean;
}

/** Compact relative time: "now", "5m", "3h", "2d", else a short date. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ConversationRow({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
  onPin,
  onArchive,
  onRestore,
  archived = false,
}: ConversationRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const pinned = conversation.pinned_at != null;

  const startRename = () => {
    setDraft(conversation.title);
    setRenaming(true);
  };

  const commitRename = () => {
    if (!renaming) return;
    setRenaming(false);
    const next = draft.trim();
    if (next && next !== conversation.title) {
      onRename(conversation.id, next);
    }
  };

  const cancelRename = () => {
    setRenaming(false);
    setDraft(conversation.title);
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors",
        active ? "bg-white/[0.05]" : "hover:bg-white/[0.04]"
      )}
    >
      {/* Active indicator — emerald left bar */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand"
        />
      )}

      {/* Title / preview — selects the conversation, or the inline rename input */}
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            else if (e.key === "Escape") cancelRename();
          }}
          onBlur={commitRename}
          className="min-w-0 flex-1 rounded border border-brand/40 bg-transparent px-1.5 py-0.5 text-[13px] text-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelect(conversation.id)}
          className="min-w-0 flex-1 text-left"
        >
          <div
            className={cn(
              "flex items-center gap-1 truncate text-[13px] leading-snug",
              active ? "font-medium text-foreground" : "text-foreground/85"
            )}
          >
            {pinned && !archived && (
              <Pin
                aria-hidden
                className="h-3 w-3 shrink-0 text-brand"
              />
            )}
            <span className="truncate">{conversation.title}</span>
          </div>
          {conversation.last_message_preview && (
            <div className="mt-0.5 truncate text-[11px] leading-snug text-foreground-muted">
              {conversation.last_message_preview}
            </div>
          )}
        </button>
      )}

      {/* Meta: timestamp + ⋯ menu (menu revealed on hover / active) */}
      {!renaming && (
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          <span className="text-[10px] tabular-nums text-foreground-muted/70">
            {relativeTime(conversation.updated_at)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Conversation actions"
                onClick={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:opacity-100 data-[state=open]:bg-white/[0.06] data-[state=open]:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {archived ? (
                <DropdownMenuItem
                  onClick={() => onRestore?.(conversation.id)}
                  className="cursor-pointer"
                >
                  <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => onPin?.(conversation.id, !pinned)}
                    className="cursor-pointer"
                  >
                    {pinned ? (
                      <PinOff className="mr-2 h-3.5 w-3.5" />
                    ) : (
                      <Pin className="mr-2 h-3.5 w-3.5" />
                    )}
                    {pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={startRename}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onArchive?.(conversation.id)}
                    className="cursor-pointer"
                  >
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(conversation.id)}
                className="cursor-pointer text-red-300 focus:text-red-200"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
