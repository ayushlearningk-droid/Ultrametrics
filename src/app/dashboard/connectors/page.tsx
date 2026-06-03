import Link from "next/link";
import { AddConnectorButton } from "@/components/connectors/add-connector-button";
import { ProviderCard } from "@/components/connectors/provider-card";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Connectors",
};

export default async function ConnectorsPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  console.log("========== CONNECTORS PAGE ==========");
console.log("WORKSPACE ID:", workspaceId);
console.log("WORKSPACES:", workspaces);
console.log("====================================");
  const connectors = await getConnectorsByWorkspace(workspaceId!);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Connectors</h2>
          <p className="text-muted-foreground">
            Manage data source connections for this workspace.
          </p>
        </div>
        <AddConnectorButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONNECTOR_PROVIDERS.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected sources</CardTitle>
          <CardDescription>
            {connectors.length} connector(s) in this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectors.length > 0 ? (
            <div className="divide-y rounded-lg border">
              {connectors.map((connector) => (
                <div
                  key={connector.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="font-medium">{connector.name}</p>
                    <p className="text-sm capitalize text-muted-foreground">
                      {connector.provider.replaceAll("_", " ")}
                    </p>
                    {connector.external_account_name && (
                      <p className="text-xs text-muted-foreground">
                        {connector.external_account_name}
                        {connector.external_account_id
                          ? ` · ${connector.external_account_id}`
                          : null}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {connector.last_synced_at && (
                      <span className="text-xs text-muted-foreground">
                        Last sync:{" "}
                        {new Date(connector.last_synced_at).toLocaleDateString()}
                      </span>
                    )}
                    <Badge
                      variant={
                        connector.status === "active" ? "success" : "secondary"
                      }
                    >
                      {connector.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                No connectors yet. Select a provider above to connect your first
                data source.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/dashboard">Back to overview</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
