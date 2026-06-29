/**
 * Conversation search provider (Sprint 58).
 *
 * Reuses the existing conversations data layer — listConversations already does
 * a sanitised ilike over title + last_message_preview, RLS-scoped. Read-only.
 */

import { listConversations } from "@/lib/data/conversations";
import type { SearchProvider, SearchResult, SearchQuery } from "../types";

export const conversationSearchProvider: SearchProvider = {
  category: "conversations",
  label: "Conversations",
  async search({ workspaceId, q, limit }: SearchQuery): Promise<SearchResult[]> {
    const conversations = await listConversations(workspaceId, { q });
    return conversations.slice(0, limit).map((c) => ({
      id: c.id,
      category: "conversations",
      title: c.title?.trim() || "Untitled conversation",
      snippet: c.last_message_preview ?? undefined,
      url: `/dashboard?conversation=${c.id}`,
      updatedAt: c.updated_at,
    }));
  },
};
