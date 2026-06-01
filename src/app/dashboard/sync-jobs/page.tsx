import {
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
  title: "Sync jobs",
};

export default async function SyncJobsPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  const [jobs, connectors] = await Promise.all([
    getSyncJobsByWorkspace(workspaceId!),
    getConnectorsByWorkspace(workspaceId!),
  ]);

  const connectorMap = new Map(connectors.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sync jobs</h2>
        <p className="text-muted-foreground">
          View history and status of all data pipeline runs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job history</CardTitle>
          <CardDescription>Most recent sync activity</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Connector</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Records</th>
                    <th className="pb-3 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const connector = connectorMap.get(job.connector_id);
                    return (
                      <tr key={job.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium">
                            {connector?.name ?? "Unknown"}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {connector?.provider?.replace("_", " ")}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
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
                        </td>
                        <td className="py-3 pr-4">
                          {job.records_processed.toLocaleString()}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {job.started_at
                            ? new Date(job.started_at).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sync jobs recorded yet. Jobs appear here once connectors run
              their first sync.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
