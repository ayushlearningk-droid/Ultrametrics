import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Database,
  Plug,
  RefreshCw,
} from "lucide-react";
import { MetaAdsOverviewCard } from "@/components/dashboard/meta-ads-overview-card";
import {
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
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
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import type { ConnectorStatus, SyncJobStatus } from "@/types/database";

export const metadata = {
  title: "Overview",
};

function formatProvider(provider: string): string {
  const found = CONNECTOR_PROVIDERS.find((p) => p.id === provider);
  if (found) return found.name;
  return provider.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

export default async function DashboardPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  const [allJobs, connectors] = await Promise.all([
    getSyncJobsByWorkspace(workspaceId!, 50),
    getConnectorsByWorkspace(workspaceId!),
  ]);

  const activeConnectors = connectors.filter((c) => c.status === "active");
  const completedJobs = allJobs.filter((j) => j.status === "completed");
  const recordsSynced = completedJobs.reduce(
    (sum, j) => sum + (j.records_processed ?? 0),
    0
  );
  const lastSyncAt =
    completedJobs[0]?.completed_at ?? completedJobs[0]?.created_at ?? null;
  const connectorMap = Object.fromEntries(connectors.map((c) => [c.id, c]));

  const stats = [
    {
      title: "Active connectors",
      value: activeConnectors.length,
      icon: Plug,
      description: `${connectors.length} total configured`,
    },
    {
      title: "Sync jobs",
      value: allJobs.length,
      icon: RefreshCw,
      description: "Last 50 pipeline runs",
    },
    {
      title: "Records synced",
      value: recordsSynced.toLocaleString(),
      icon: Database,
      description: "Across all connectors",
    },
    {
      title: "Last sync",
      value: formatRelativeTime(lastSyncAt),
      icon: Activity,
      description: lastSyncAt
        ? new Date(lastSyncAt).toLocaleString()
        : "No syncs yet",
    },
  ];

  return (
    <AnimatedPage className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MetaAdsOverviewCard />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle>Recent syncs</CardTitle>
              <CardDescription>Latest pipeline activity</CardDescription>
            </div>
            {allJobs.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="-mr-2 h-8 text-xs">
                <Link href="/dashboard/sync-jobs">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {allJobs.length > 0 ? (
              <ul className="space-y-2">
                {allJobs.slice(0, 5).map((job) => {
                  const jobConnector = connectorMap[job.connector_id];
                  const label = jobConnector
                    ? `${formatProvider(jobConnector.provider)} Sync`
                    : "Sync job";
                  return (
                    <li
                      key={job.id}
                      className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <StatusDot
                          status={job.status as SyncJobStatus}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(job.created_at)} ·{" "}
                            {job.records_processed.toLocaleString()} records
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "success"
                            : job.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="ml-3 shrink-0 capitalize"
                      >
                        {job.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={RefreshCw}
                title="No syncs yet"
                description="Connect a data source and run your first sync."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/connectors">Add connector</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle>Connected sources</CardTitle>
              <CardDescription>Your active data pipelines</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="-mr-2 h-8 text-xs">
              <Link href="/dashboard/connectors">
                Manage
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {connectors.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {connectors.slice(0, 4).map((connector) => {
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
                          <p className="truncate text-sm font-medium">
                            {connector.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatProvider(connector.provider)}
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
                          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                            <Link href={providerHref}>Manage</Link>
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
                title="No connectors configured"
                description="Add your first connector to start syncing data into Google Sheets."
                action={
                  <Button variant="brand" size="sm" asChild>
                    <Link href="/dashboard/connectors">Add connector</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AnimatedPage>
  );
}
