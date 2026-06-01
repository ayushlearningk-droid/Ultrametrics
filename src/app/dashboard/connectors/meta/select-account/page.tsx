import Link from "next/link";
import { ConnectorBackLink } from "@/components/connectors/connector-back-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { META_ADS_CONNECT_PATH } from "@/lib/connectors/providers";

export const metadata = {
  title: "Select Meta Ad Account",
};

export default function MetaAdsSelectAccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ConnectorBackLink
        href={META_ADS_CONNECT_PATH}
        label="Back to Meta connection"
      />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Select ad account
        </h2>
        <p className="text-muted-foreground">
          Choose which Meta ad account to connect to this workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available accounts</CardTitle>
          <CardDescription>
            Accounts load from the Meta Graph API after you complete Facebook
            login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No ad accounts to show yet. Complete Facebook login on the
              connection page first.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={META_ADS_CONNECT_PATH}>Go to connection page</Link>
            </Button>
          </div>
          <Button variant="brand" className="w-full sm:w-auto" disabled>
            Save connection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
