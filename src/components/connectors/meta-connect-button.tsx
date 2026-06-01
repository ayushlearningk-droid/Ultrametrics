"use client";

import { Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";

type MetaConnectButtonProps = {
  workspaceId: string;
  configured: boolean;
};

export function MetaConnectButton({
  workspaceId,
  configured,
}: MetaConnectButtonProps) {
  if (!configured) {
    return (
      <Button variant="brand" className="w-full sm:w-auto" disabled>
        Connect with Facebook
      </Button>
    );
  }

  const startUrl = `/api/connectors/meta/oauth/start?workspaceId=${encodeURIComponent(workspaceId)}`;

  return (
    <Button variant="brand" className="w-full sm:w-auto" asChild>
      <a href={startUrl}>
        <Facebook className="mr-2 h-4 w-4" />
        Connect with Facebook
      </a>
    </Button>
  );
}
