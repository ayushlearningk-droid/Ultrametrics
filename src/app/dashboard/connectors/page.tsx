/**
 * Connector Marketplace — page (Sprint 50).
 *
 * Renders the premium connector marketplace from the catalog (single source of
 * truth). Reads the workspace's real connected providers (existing read-only
 * fetcher) ONLY to mark cards as Connected — no backend, OAuth, sync, or
 * connector-logic changes. Live providers reuse their existing connect routes.
 */

import { ConnectorMarketplace } from "@/components/dashboard/connector-marketplace";
import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";

export const metadata = { title: "Connectors" };

export default async function ConnectorsPage() {
  // Read-only: resolve which catalog providers are already connected.
  let connectedIds: string[] = [];
  try {
    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);
    if (workspaceId) {
      const connectors = await getConnectorsByWorkspace(workspaceId);
      connectedIds = [...new Set(connectors.map((c) => c.provider))];
    }
  } catch {
    connectedIds = [];
  }

  return (
    <ConnectorMarketplace catalog={CONNECTOR_CATALOG} connectedIds={connectedIds} />
  );
}
