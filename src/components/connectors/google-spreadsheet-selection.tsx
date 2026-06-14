"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Spreadsheet = {
  id: string;
  name: string;
};

type ListSpreadsheetsResponse = {
  spreadsheets?: Spreadsheet[];
  error?: string;
};

export function GoogleSpreadsheetSelection() {
  const router = useRouter();
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSelecting, startSelecting] = useTransition();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/connectors/google/sheets", {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as ListSpreadsheetsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? response.statusText);
      }

      setSpreadsheets(payload.spreadsheets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spreadsheets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (sheet: Spreadsheet) => {
    setSelectingId(sheet.id);

    startSelecting(async () => {
      try {
        const response = await fetch("/api/connectors/google/sheets/select", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spreadsheetId: sheet.id,
            spreadsheetName: sheet.name,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };

        if (!response.ok || payload.ok !== true) {
          throw new Error(payload.error ?? response.statusText);
        }

        router.push("/dashboard/connectors/google");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to save spreadsheet selection"
        );
      } finally {
        setSelectingId(null);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {spreadsheets.length} spreadsheet(s) found.
        </p>
        <Button variant="outline" onClick={load} disabled={isSelecting}>
          Reload
        </Button>
      </div>

      {spreadsheets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No spreadsheets found. If you just connected Google, try reloading.
        </div>
      ) : (
        <div className="space-y-3">
          {spreadsheets.map((sheet) => {
            const isThisSelecting = isSelecting && selectingId === sheet.id;

            return (
              <div key={sheet.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{sheet.name}</p>
                    <p className="text-sm text-muted-foreground">{sheet.id}</p>
                  </div>

                  <Button onClick={() => handleSelect(sheet)} disabled={isSelecting}>
                    {isThisSelecting ? "Selecting..." : "Select"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}