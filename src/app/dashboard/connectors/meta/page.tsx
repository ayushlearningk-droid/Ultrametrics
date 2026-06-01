import Link from "next/link";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { MetaConnectButton } from "@/components/connectors/meta-connect-button";
import { MetaOAuthAlerts } from "@/components/connectors/meta-oauth-alerts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMetaOAuthConfig } from "@/lib/meta/config";
import {
  META_ADS_SELECT_ACCOUNT_PATH,
} from "@/lib/connectors/providers";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";

export const metadata = {
  title: "Connect Meta Ads",
};

const STEPS = [
  "Sign in with your Facebook account",
  "Grant Ultrametrics access to your ad accounts",
  "Choose the ad account to connect to this workspace",
];

export default async function MetaAdsConnectPage({
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
  const metaConfig = getMetaOAuthConfig();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ConnectorBackLink href="/dashboard/connectors" />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Connect Meta Ads</h2>
        <p className="text-muted-foreground">
          Link a Meta (Facebook) ad account to sync campaign data into this
          workspace.
        </p>
      </div>

      <MetaOAuthAlerts
        oauth={params.oauth}
        error={params.error}
        reason={params.reason}
      />

      <Card>
        <CardHeader>
          <CardTitle>Connection steps</CardTitle>
          <CardDescription>
            Sign in with Facebook to authorize Ultrametrics for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {workspaceId ? (
            <MetaConnectButton
              workspaceId={workspaceId}
              configured={metaConfig !== null}
            />
          ) : (
            <Button variant="brand" className="w-full sm:w-auto" disabled>
              Connect with Facebook
            </Button>
          )}
          {!metaConfig && (
            <p className="text-xs text-muted-foreground">
              Set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                META_APP_ID
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                META_APP_SECRET
              </code>
              , and optionally{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                META_OAUTH_REDIRECT_URI
              </code>{" "}
              in <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">.env.local</code>.
            </p>
          )}
        </CardContent>
      </Card>

      {params.oauth === "success" && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Next step</CardTitle>
            <CardDescription>
              Ad account selection is not available yet. Your token is stored in{" "}
              <code className="rounded bg-muted px-1 text-xs">
                oauth_pending_sessions
              </code>{" "}
              until the next phase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={META_ADS_SELECT_ACCOUNT_PATH}>
                Continue to select account (preview)
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
