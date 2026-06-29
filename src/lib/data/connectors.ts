/**
 * Connectors — data layer (Sprint 58, search).
 *
 * RLS-scoped reads over public.connectors through the user's SSR (anon) client,
 * so workspace membership is DB-enforced. Read-only; mirrors the conversations /
 * workspace-memory data layers. No connector architecture changes.
 */

import { createClient } from "@/lib/supabase/server";
import type { Connector } from "@/types/database";

/** Default cap on connector search results. */
export const CONNECTOR_SEARCH_LIMIT = 25;

const CONNECTOR_SEARCH_MAX = 100;

/** Sanitise a query for a PostgREST ilike/or filter (mirrors conversations). */
function sanitizeConnectorSearch(q: string): string {
  return q.replace(/[,()%*\\_]/g, "").trim().slice(0, CONNECTOR_SEARCH_MAX);
}

/**
 * Search a workspace's connectors by name / provider / external account name
 * (ilike substring), newest-first. Returns [] when the query sanitises to empty.
 * RLS-scoped.
 */
export async function searchConnectors(
  workspaceId: string,
  q: string,
  limit: number = CONNECTOR_SEARCH_LIMIT
): Promise<Connector[]> {
  const safe = sanitizeConnectorSearch(q);
  if (!safe) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("connectors")
    .select("*")
    .eq("workspace_id", workspaceId)
    .or(
      `name.ilike.%${safe}%,provider.ilike.%${safe}%,` +
        `external_account_name.ilike.%${safe}%`
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Connector[];
}
