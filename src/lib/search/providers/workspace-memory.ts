/**
 * Workspace memory search provider (Sprint 58).
 *
 * Reuses the workspace-memory data layer — listMemories now accepts an optional
 * ilike `q` over `content` (RLS-scoped). Read-only.
 */

import { listMemories } from "@/lib/data/workspace-memory";
import type { SearchProvider, SearchResult, SearchQuery } from "../types";

/** First line / first ~80 chars of a note, for a compact title. */
function titleFromContent(content: string): string {
  const firstLine = content.split("\n", 1)[0].trim();
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
}

export const workspaceMemorySearchProvider: SearchProvider = {
  category: "workspace_memory",
  label: "Workspace Memory",
  async search({ workspaceId, q, limit }: SearchQuery): Promise<SearchResult[]> {
    const memories = await listMemories(workspaceId, { q, limit });
    return memories.map((m) => ({
      id: m.id,
      category: "workspace_memory",
      title: titleFromContent(m.content),
      subtitle: m.source === "ai" ? "AI note" : "User note",
      snippet: m.content,
      updatedAt: m.updated_at,
    }));
  },
};
