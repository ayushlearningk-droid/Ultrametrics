"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

type GoogleAdsAccountConnectButtonProps = {
  customerId: string;
  customerName: string;
  currencyCode: string;
};

export function GoogleAdsAccountConnectButton({
  customerId,
  customerName,
  currencyCode,
}: GoogleAdsAccountConnectButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConnect = () => {
    startTransition(async () => {
      const response = await fetch("/api/connectors/google-ads/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerId, customerName, currencyCode }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        console.error(
          "Failed to connect Google Ads account",
          payload.error ?? response.statusText
        );
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
