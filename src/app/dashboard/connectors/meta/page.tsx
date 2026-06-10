import Link from "next/link";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { MetaConnectButton } from "@/components/connectors/meta-connect-button";
import { MetaOAuthAlerts } from "@/components/connectors/meta-oauth-alerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getMetaOAuthConfig } from "@/lib/meta/config";
import { META_ADS_SELECT_ACCOUNT_PATH } from "@/lib/connectors/providers";
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

  const allConnectors = workspaceId
    ? await getConnectorsByWorkspace(workspaceId)
    : [];
  const connector = allConnectors.find((c) => c.provider === "meta_ads") ?? null;

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

      {connector ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Meta Ads</CardTitle>
                <CardDescription className="mt-1">
                  An account is connected to this workspace.
                </CardDescription>
              </div>
              <Badge
                variant={connector.status === "active" ? "success" : "secondary"}
                className="mt-0.5 shrink-0"
              >
                {connector.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
              <p className="font-medium">
                {connector.external_account_name ?? connector.name}
              </p>
              {connector.external_account_id && (
                <p className="text-muted-foreground">
                  Account ID: {connector.external_account_id}
                </p>
              )}
              {connector.last_synced_at && (
                <p className="text-muted-foreground">
                  Last synced:{" "}
                  {new Date(connector.last_synced_at).toLocaleString()}
                </p>
              )}
            </div>
            {workspaceId && metaConfig ? (
              <Button variant="outline" asChild>
                <a
                  href={`/api/connectors/meta/oauth/start?workspaceId=${encodeURIComponent(workspaceId)}`}
                >
                  Reconnect
                </a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
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
                in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                  .env.local
                </code>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {params.oauth === "success" && !connector && (
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
