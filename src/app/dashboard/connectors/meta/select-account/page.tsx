import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { MetaAccountConnectButton } from "@/components/connectors/meta-account-connect-button";
import { META_ADS_CONNECT_PATH } from "@/lib/connectors/providers";
import { getMockMetaAdAccounts } from "@/lib/meta/ad-accounts";

export const metadata = {
  title: "Select Meta Ad Account",
};

export default async function MetaAdsSelectAccountPage() {
  const accounts = getMockMetaAdAccounts();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ConnectorBackLink
        href={META_ADS_CONNECT_PATH}
        label="Back to Meta connection"
      />

      <div>
        <h1 className="text-4xl font-bold text-red-500">
          AYUSH TEST 999
        </h1>

        <p className="mt-2 text-muted-foreground">
          If you can see this text, Vercel is using the correct
          select-account page.
        </p>

        <p className="mt-4 text-lg font-semibold text-green-500">
          Accounts Loaded: {accounts.length}
        </p>
      </div>

      <div className="space-y-4">
        {accounts.map((account) => (
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
                  {account.account_id}
                </p>

                <p className="text-xs text-muted-foreground">
                  {account.currency}
                </p>
              </div>

              <MetaAccountConnectButton account={account} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}