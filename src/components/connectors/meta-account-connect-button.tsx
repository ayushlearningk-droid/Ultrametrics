"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { MetaAdAccount } from "@/lib/meta/ad-accounts";

export function MetaAccountConnectButton({
  account,
}: {
  account: MetaAdAccount;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConnect = () => {
    startTransition(async () => {
      const response = await fetch("/api/connectors/meta/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: account.account_id,
          name: account.name,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        console.error("Failed to connect Meta account", payload.error ?? response.statusText);
        return;
      }

      router.push("/dashboard/connectors");
    });
  };

  return (
    <Button onClick={handleConnect} disabled={isPending}>
      {isPending ? "Connecting..." : "Connect"}
    </Button>
  );
}
