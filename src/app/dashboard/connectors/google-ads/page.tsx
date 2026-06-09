import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { GoogleAdsConnectButton } from "@/components/connectors/google-ads-connect-button";
import { GoogleAdsOAuthAlerts } from "@/components/connectors/google-ads-oauth-alerts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getGoogleAdsConfig } from "@/lib/google-ads/config";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";

export const metadata = {
  title: "Connect Google Ads",
};

const STEPS = [
  "Sign in with your Google account",
  "Grant Ultrametrics access to your Google Ads accounts",
  "Choose the ad account to connect to this workspace",
];

export default async function GoogleAdsConnectPage({
  searchParams,
}: {
  searchParams: Promise<{
    oauth?: string;
    error?: string;
    reason?: string;
  }>;
}) {
  const params = await searchParams;
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  const googleAdsConfig = getGoogleAdsConfig();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ConnectorBackLink href="/dashboard/connectors" />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Connect Google Ads</h2>
        <p className="text-muted-foreground">
          Link a Google Ads account to sync campaign data into this workspace.
        </p>
      </div>

      <GoogleAdsOAuthAlerts
        oauth={params.oauth}
        error={params.error}
        reason={params.reason}
      />

      <Card>
        <CardHeader>
          <CardTitle>Connection steps</CardTitle>
          <CardDescription>
            Sign in with Google to authorize Ultrametrics for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {workspaceId ? (
            <GoogleAdsConnectButton
              workspaceId={workspaceId}
              configured={googleAdsConfig !== null}
            />
          ) : (
            <Button variant="brand" className="w-full sm:w-auto" disabled>
              Connect Google Ads
            </Button>
          )}
          {!googleAdsConfig && (
            <p className="text-xs text-muted-foreground">
              Set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                GOOGLE_ADS_DEVELOPER_TOKEN
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                GOOGLE_ADS_MCC_CUSTOMER_ID
              </code>
              , and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                GOOGLE_ADS_OAUTH_REDIRECT_URI
              </code>{" "}
              in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                .env.local
              </code>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
