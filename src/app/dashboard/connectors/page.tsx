import Link from "next/link";
import { ArrowRight, Plug } from "lucide-react";
import { ProviderCard } from "@/components/connectors/provider-card";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { AnimatedPage } from "@/components/ui/animated-page";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConnectorStatus } from "@/types/database";

export const metadata = {
  title: "Connectors",
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default async function ConnectorsPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  const connectors = await getConnectorsByWorkspace(workspaceId!);

  const availableProviders = CONNECTOR_PROVIDERS.filter((p) => p.available);
  const comingSoonProviders = CONNECTOR_PROVIDERS.filter((p) => !p.available);

  const connectedProviderIds = new Set(connectors.map((c) => c.provider));

  return (
    <AnimatedPage className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Data sources</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect a platform to start syncing data into Google Sheets.
        </p>
      </div>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Available
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              connected={connectedProviderIds.has(provider.id)}
            />
          ))}
        </div>
      </section>

      {comingSoonProviders.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Coming soon
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comingSoonProviders.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Connected sources</CardTitle>
          <CardDescription>
            {connectors.length === 0
              ? "No connectors configured yet"
              : `${connectors.length} connector${connectors.length === 1 ? "" : "s"} in this workspace`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectors.length > 0 ? (
            <div className="divide-y rounded-lg border">
              {connectors.map((connector) => {
                const providerInfo = CONNECTOR_PROVIDERS.find(
                  (p) => p.id === connector.provider
                );
                const Icon = providerInfo?.icon;
                const providerHref = providerInfo?.href;

                return (
                  <div
                    key={connector.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {Icon && providerInfo && (
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${providerInfo.color}`}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <StatusDot
                            status={connector.status as ConnectorStatus}
                          />
                          {connector.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {providerInfo?.name ?? connector.provider}
                          {connector.external_account_name && (
                            <> · {connector.external_account_name}</>
                          )}
                          {connector.last_synced_at && (
                            <> · {formatRelativeTime(connector.last_synced_at)}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <Badge
                        variant={
                          connector.status === "active" ? "success" : "secondary"
                        }
                        className="capitalize"
                      >
                        {connector.status}
                      </Badge>
                      {providerHref && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-7 gap-1 text-xs"
                        >
                          <Link href={providerHref}>
                            Manage
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Plug}
              title="No connectors yet"
              description="Select a provider above to connect your first data source."
            />
          )}
        </CardContent>
      </Card>
    </AnimatedPage>
  );
}
