"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingActionsProps {
  workspaceId: string;
  currentPlanId: string;
}

export function BillingActions({
  workspaceId,
  currentPlanId,
}: BillingActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function startCheckout(planId: string, interval: "monthly" | "yearly") {
    setLoading(`${planId}-${interval}`);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, planId, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {currentPlanId === "starter" && (
        <Button
          variant="brand"
          onClick={() => startCheckout("growth", "monthly")}
          disabled={!!loading}
        >
          {loading === "growth-monthly" ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Upgrade to Growth"
          )}
        </Button>
      )}
      <Button variant="outline" onClick={openPortal} disabled={!!loading}>
        {loading === "portal" ? (
          <Loader2 className="animate-spin" />
        ) : (
          "Manage billing"
        )}
      </Button>
    </div>
  );
}
