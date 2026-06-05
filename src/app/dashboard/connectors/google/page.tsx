import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { GoogleConnectButton } from "@/components/connectors/google-connect-button";
import { GoogleSpreadsheetSelection } from "@/components/connectors/google-spreadsheet-selection";
import { GoogleSyncNowButton } from "@/components/connectors/google-sync-now-button";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { getGoogleOAuthConfig } from "@/lib/google/config";

export const metadata = {
  title: "Connect Google Sheets",
};

export default async function GoogleSheetsConnectorPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  const configured = Boolean(getGoogleOAuthConfig());

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
    </div>
  );
}
