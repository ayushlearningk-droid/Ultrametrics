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

type MetaAccount = {
  id: string;
  name: string;
  account_id?: string;
  currency?: string;
};

export default async function MetaAdsSelectAccountPage() {
  const workspaces = await getUserWorkspaces();

  const workspaceId = await getCurrentWorkspaceId(
    workspaces
  );

  const session = workspaceId
    ? await getLatestMetaPendingSession(workspaceId)
    : null;

  const accounts: MetaAccount[] = session?.access_token
    ? await getMetaAdAccounts(session.access_token)
    : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 sm:px-8">
      <ConnectorBackLink
        href={META_ADS_CONNECT_PATH}
        label="Back to Meta connection"
      />

      <div className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Select Ad Account
        </p>
        <p className="mt-2 text-[13px] text-white/50">
          Choose the Meta ad account to connect to this workspace.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-[13px] text-white/40">No ad accounts found on this Meta account.</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-colors hover:border-white/[0.1] hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground/80">
                  {account.name}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-white/28">
                  #{account.account_id || account.id}
                  {account.currency ? ` · ${account.currency}` : ""}
                </p>
              </div>

              <MetaAccountConnectButton
                account={{
                  id: account.id,
                  name: account.name,
                  account_id: account.account_id || account.id,
                  currency: account.currency || "USD",
                  status: "active",
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}