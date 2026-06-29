/**
 * Connector search provider (Sprint 58).
 *
 * Reuses the connectors data layer — searchConnectors does an ilike over name /
 * provider / external_account_name (RLS-scoped). Read-only; connector metadata
 * only (never credentials).
 */

import { searchConnectors } from "@/lib/data/connectors";
import type { SearchProvider, SearchResult, SearchQuery } from "../types";

export const connectorSearchProvider: SearchProvider = {
  category: "connectors",
  label: "Connectors",
  async search({ workspaceId, q, limit }: SearchQuery): Promise<SearchResult[]> {
    const connectors = await searchConnectors(workspaceId, q, limit);
    return connectors.map((c) => ({
      id: c.id,
      category: "connectors",
      title: c.name,
      subtitle: c.external_account_name
        ? `${c.provider} · ${c.external_account_name}`
        : c.provider,
      snippet: `Status: ${c.status}`,
      url: `/dashboard/connectors`,
      updatedAt: c.updated_at,
    }));
  },
};
