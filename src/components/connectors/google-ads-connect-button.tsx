"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type GoogleAdsConnectButtonProps = {
  workspaceId: string;
  configured: boolean;
};

export function GoogleAdsConnectButton({
  workspaceId,
  configured,
}: GoogleAdsConnectButtonProps) {
  if (!configured) {
    return (
      <Button variant="brand" className="w-full sm:w-auto" disabled>
        Connect Google Ads
      </Button>
    );
  }

  const startUrl = `/api/connectors/google-ads/oauth/start?workspaceId=${encodeURIComponent(workspaceId)}`;

  return (
    <Button variant="brand" className="w-full sm:w-auto" asChild>
      <a href={startUrl}>
        <BarChart3 className="mr-2 h-4 w-4" />
        Connect Google Ads
      </a>
    </Button>
  );
}
