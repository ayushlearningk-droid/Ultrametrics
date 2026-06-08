import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { GoogleConnectButton } from "@/components/connectors/google-connect-button";
import { GoogleScheduleConfig } from "@/components/connectors/google-schedule-config";
import { GoogleSpreadsheetSelection } from "@/components/connectors/google-spreadsheet-selection";
import { GoogleSyncNowButton } from "@/components/connectors/google-sync-now-button";
import { getSyncJobsByWorkspace } from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { getGoogleOAuthConfig } from "@/lib/google/config";

export const metadata = {
  title: "Connect Google Sheets",
};

export default async function GoogleSheetsConnectorPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  const configured = Boolean(getGoogleOAuthConfig());
  const syncJobs = workspaceId
    ? await getSyncJobsByWorkspace(workspaceId, 10)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ConnectorBackLink href="/dashboard/connectors" label="Back to connectors" />

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Connect Google Sheets</h2>
        <p className="text-muted-foreground">
          Authorize access to your Google Sheets and Drive file scopes to sync data.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          This flow uses Google Identity OAuth 2.0 and stores the connector details in the existing connector table structure.
        </p>

        {workspaceId ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <GoogleConnectButton workspaceId={workspaceId} configured={configured} />
          </div>
        ) : (
          <p className="mt-6 text-sm text-destructive">No active workspace is available.</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Select a spreadsheet</h3>
          <p className="text-sm text-muted-foreground">
            Choose which Google Spreadsheet this workspace should use.
          </p>
        </div>

        <div className="mt-6">
          <GoogleSpreadsheetSelection />
        </div>

        <div className="mt-6 border-t pt-6">
          <h4 className="text-sm font-medium">Manual sync</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Trigger an immediate sync from Meta Ads into the selected spreadsheet.
          </p>
          <div className="mt-4">
            <GoogleSyncNowButton />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Scheduler</h3>
          <p className="text-sm text-muted-foreground">
            Configure automated sync frequency for this workspace.
          </p>
        </div>

        <div className="mt-6">
          <GoogleScheduleConfig />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Sync history</h3>
          <p className="text-sm text-muted-foreground">
            Last 10 sync jobs for this workspace.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Rows Synced</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {syncJobs.length > 0 ? (
                syncJobs.map((job) => (
                  <tr key={job.id} className="border-b last:border-0">
                    <td className="py-2">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="py-2">{job.records_processed}</td>
                    <td className="py-2 capitalize">{job.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-muted-foreground">
                    No sync jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
