"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScheduleFrequency = "hourly" | "daily" | "weekly";

type ScheduleResponse = {
  schedule?: {
    workspace_id: string;
    frequency: ScheduleFrequency;
    enabled: boolean;
    updated_at: string;
  } | null;
  error?: string;
};

const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
};

export function GoogleScheduleConfig() {
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    async function loadSchedule() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/connectors/google/schedule", {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as ScheduleResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? response.statusText);
        }

        if (payload.schedule) {
          setFrequency(payload.schedule.frequency);
          setIsEnabled(payload.schedule.enabled);
          setLastUpdatedAt(payload.schedule.updated_at);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load scheduler settings"
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSchedule();
  }, []);

  const handleSave = () => {
    startSaving(async () => {
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch("/api/connectors/google/schedule", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            frequency,
            enabled: true,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as ScheduleResponse & {
          ok?: boolean;
        };

        if (!response.ok || payload.ok !== true || !payload.schedule) {
          throw new Error(payload.error ?? response.statusText);
        }

        setFrequency(payload.schedule.frequency);
        setIsEnabled(payload.schedule.enabled);
        setLastUpdatedAt(payload.schedule.updated_at);
        setSuccessMessage("Scheduler updated.");
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save scheduler settings"
        );
      }
    });
  };

  const statusText = isEnabled
    ? `Active: ${FREQUENCY_LABELS[frequency]}`
    : "Not configured";

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading scheduler settings...</p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {successMessage ? (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      ) : null}

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p>
          <span className="font-medium">Current status:</span> {statusText}
        </p>
        {lastUpdatedAt ? (
          <p className="mt-1 text-muted-foreground">
            Last updated: {new Date(lastUpdatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Sync frequency</label>
        <Select
          value={frequency}
          onValueChange={(value) => setFrequency(value as ScheduleFrequency)}
          disabled={isLoading || isSaving}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} disabled={isLoading || isSaving}>
        {isSaving ? "Saving..." : "Save scheduler"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Schedule persistence only. Automatic execution is not enabled yet.
      </p>
    </div>
  );
}
