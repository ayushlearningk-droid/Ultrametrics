import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { MetaAccountConnectButton } from "@/components/connectors/meta-account-connect-button";
import { META_ADS_CONNECT_PATH } from "@/lib/connectors/providers";

import {
  getCurrentWorkspaceId,
  getUserWorkspaces,
} from "@/lib/data/workspaces";

import { getLatestMetaPendingSession } from "@/lib/meta/pending";
import { getMetaAdAccounts } from "@/lib/meta/oauth";

export const metadata = {
  title: "Select Meta Ad Account",
};

export default async function MetaAdsSelectAccountPage() {
  const workspaces = await getUserWorkspaces();

  const workspaceId =
    await getCurrentWorkspaceId(workspaces);

  const session = workspaceId
    ? await getLatestMetaPendingSession(workspaceId)
    : null;

  const accounts = session?.access_token
    ? await getMetaAdAccounts(session.access_token)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ConnectorBackLink
        href={META_ADS_CONNECT_PATH}
        label="Back to Meta connection"
      />

      <div>
        <h1 className="text-4xl font-bold text-green-500">
          REAL META ACCOUNTS
        </h1>

        <p className="mt-2 text-muted-foreground">
          Loaded directly from Meta Graph API
        </p>

        <p className="mt-4 text-lg font-semibold text-green-500">
          Accounts Loaded: {accounts.length}
        </p>
      </div>

      <div className="space-y-4">
        {accounts.map((account: any) => (
          <div
            key={account.id}
            className="rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {account.name}
                </p>

                <p className="text-sm text-muted-foreground">
                  {account.account_id || account.id}
                </p>

                <p className="text-xs text-muted-foreground">
                  {account.currency}
                </p>
              </div>

              <MetaAccountConnectButton
                account={{
                  id: account.id,
                  name: account.name,
                  account_id:
                    account.account_id || account.id,
                  currency:
                    account.currency || "USD",
                  status: "active",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}