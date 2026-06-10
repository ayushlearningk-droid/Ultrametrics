import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { GoogleAdsAccountConnectButton } from "@/components/connectors/google-ads-account-connect-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getGoogleAdsConfig } from "@/lib/google-ads/config";
import {
  listAccessibleCustomers,
  type GoogleAdsAccount,
} from "@/lib/google-ads/accounts";
import { GOOGLE_ADS_CONNECT_PATH } from "@/lib/google-ads/oauth-redirect";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";

export const metadata = {
  title: "Select Google Ads Account",
};

async function getGoogleAdsPendingSession(workspaceId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("oauth_pending_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google_ads")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

export default async function GoogleAdsSelectAccountPage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  if (!workspaceId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <ConnectorBackLink href={GOOGLE_ADS_CONNECT_PATH} label="Back to Google Ads connection" />
        <Card>
          <CardHeader>
            <CardTitle>No workspace selected</CardTitle>
            <CardDescription>
              Switch to a workspace and try connecting again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={GOOGLE_ADS_CONNECT_PATH}>Back to connection</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const googleAdsConfig = getGoogleAdsConfig();

  if (!googleAdsConfig) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <ConnectorBackLink href={GOOGLE_ADS_CONNECT_PATH} label="Back to Google Ads connection" />
        <Card>
          <CardHeader>
            <CardTitle>Google Ads not configured</CardTitle>
            <CardDescription>
              Add{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                GOOGLE_ADS_DEVELOPER_TOKEN
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                GOOGLE_ADS_MCC_CUSTOMER_ID
              </code>{" "}
              to your environment and restart the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={GOOGLE_ADS_CONNECT_PATH}>Back to connection</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = await getGoogleAdsPendingSession(workspaceId);

  console.log("[GoogleAds] pending session lookup:", session
    ? { found: true, hasAccessToken: !!session.access_token, accessTokenLength: session.access_token.length }
    : { found: false }
  );

  if (!session?.access_token) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <ConnectorBackLink href={GOOGLE_ADS_CONNECT_PATH} label="Back to Google Ads connection" />
        <Card>
          <CardHeader>
            <CardTitle>Authorization expired</CardTitle>
            <CardDescription>
              No pending Google Ads authorization found for this workspace. The
              OAuth session may have expired or was already used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={GOOGLE_ADS_CONNECT_PATH}>Reconnect Google Ads</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  let accounts: GoogleAdsAccount[] = [];
  let fetchError: string | null = null;

  try {
    accounts = await listAccessibleCustomers(
      session.access_token,
      googleAdsConfig.developerToken,
      googleAdsConfig.mccCustomerId
    );
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load accounts";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ConnectorBackLink href={GOOGLE_ADS_CONNECT_PATH} label="Back to Google Ads connection" />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Select an ad account</h2>
        <p className="text-muted-foreground">
          Choose the Google Ads account to connect to this workspace.
        </p>
      </div>

      {fetchError ? (
        <Card>
          <CardHeader>
            <CardTitle>Failed to load accounts</CardTitle>
            <CardDescription>{fetchError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={GOOGLE_ADS_CONNECT_PATH}>Try again</Link>
            </Button>
          </CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No accounts found</CardTitle>
            <CardDescription>
              No Google Ads accounts are accessible with this Google account.
              Make sure you have access to at least one account in Google Ads and
              try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={GOOGLE_ADS_CONNECT_PATH}>Reconnect with a different account</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">{account.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.currencyCode}
                  </p>
                </div>
                <GoogleAdsAccountConnectButton
                  customerId={account.id}
                  customerName={account.name}
                  currencyCode={account.currencyCode}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
