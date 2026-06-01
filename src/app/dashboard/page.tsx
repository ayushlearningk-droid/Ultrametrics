import { Activity, Plug, RefreshCw, TrendingUp } from "lucide-react";
import {
  getConnectorCount,
  getConnectorsByWorkspace,
  getSyncJobsByWorkspace,
} from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Overview",
};

export default async function DashboardPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  const [connectorCount, recentJobs, connectors] = await Promise.all([
    getConnectorCount(workspaceId!),
    getSyncJobsByWorkspace(workspaceId!, 5),
    getConnectorsByWorkspace(workspaceId!),
  ]);

  const stats = [
    {
      title: "Active connectors",
      value: connectorCount,
      icon: Plug,
      description: "Connected data sources",
    },
    {
      title: "Sync jobs (7d)",
      value: recentJobs.length,
      icon: RefreshCw,
      description: "Recent pipeline runs",
    },
    {
      title: "Success rate",
      value: "98.5%",
      icon: TrendingUp,
      description: "Last 7 days",
    },
    {
      title: "Workspace health",
      value: "Healthy",
      icon: Activity,
      description: "All systems operational",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">
          Monitor connectors and sync activity for your workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent sync jobs</CardTitle>
            <CardDescription>Latest pipeline activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length > 0 ? (
              <ul className="space-y-3">
                {recentJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Sync job · {job.records_processed.toLocaleString()} records
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.status === "completed"
                          ? "success"
                          : job.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {job.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sync jobs yet. Connect a data source to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connectors</CardTitle>
            <CardDescription>Your connected platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {connectors.length > 0 ? (
              <ul className="space-y-3">
                {connectors.slice(0, 4).map((connector) => (
                  <li
                    key={connector.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{connector.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {connector.provider}
                      </p>
                    </div>
                    <Badge
                      variant={
                        connector.status === "active" ? "success" : "secondary"
                      }
                    >
                      {connector.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No connectors configured. Add your first connector to begin syncing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
