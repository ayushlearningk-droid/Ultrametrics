"use client";

import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";

type GoogleConnectButtonProps = {
  workspaceId: string;
  configured: boolean;
};

export function GoogleConnectButton({
  workspaceId,
  configured,
}: GoogleConnectButtonProps) {
  if (!configured) {
    return (
      <Button variant="brand" className="w-full sm:w-auto" disabled>
        Connect Google Sheets
      </Button>
    );
  }

  return (
    <Button variant="brand" className="w-full sm:w-auto" asChild>
      <a href={`/api/connectors/google/start?workspaceId=${encodeURIComponent(workspaceId)}`}>
        <Database className="mr-2 h-4 w-4" />
        Connect Google Sheets
      </a>
    </Button>
  );
}
