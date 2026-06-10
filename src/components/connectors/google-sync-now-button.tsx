"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SyncResponse = {
  ok?: boolean;
  rowsWritten?: number;
  isSample?: boolean;
  error?: string;
};

export function GoogleSyncNowButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/sync/meta-to-google-sheets", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as SyncResponse;

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error ?? response.statusText ?? "Sync failed");
      }

      const rows = payload.rowsWritten ?? 0;
      const msg = payload.isSample
        ? `Sheet created with ${rows} sample rows. Connect Meta Ads to sync real data.`
        : `Synced ${rows} rows from Meta Ads successfully.`;
      setSuccessMessage(msg);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleSyncNow} disabled={isSyncing}>
        {isSyncing ? "Syncing..." : "Sync Now"}
      </Button>

      {successMessage ? (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
