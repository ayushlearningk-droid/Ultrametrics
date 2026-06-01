import Link from "next/link";
import { Plus } from "lucide-react";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
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

const PROVIDERS = [
  { id: "google_ads", name: "Google Ads", color: "bg-blue-500" },
  { id: "meta_ads", name: "Meta Ads", color: "bg-indigo-500" },
  { id: "ga4", name: "Google Analytics 4", color: "bg-orange-500" },
  { id: "shopify", name: "Shopify", color: "bg-emerald-500" },
];

export default async function ConnectorsPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
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
        <Button variant="brand" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add connector
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROVIDERS.map((provider) => (
          <Card
            key={provider.id}
            className="cursor-pointer transition-colors hover:border-brand/40"
          >
            <CardHeader className="pb-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider.color} text-sm font-bold text-white`}
              >
                {provider.name.charAt(0)}
              </div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription>Connect & sync</CardDescription>
            </CardHeader>
          </Card>
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
                      {connector.provider.replace("_", " ")}
                    </p>
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
