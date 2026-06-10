"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getLookerStudioCreateUrl,
  getSpreadsheetUrl,
} from "@/lib/looker-studio/urls";

interface LookerStudioPanelProps {
  spreadsheetId?: string;
  spreadsheetName?: string;
}

export function LookerStudioPanel({
  spreadsheetId,
  spreadsheetName,
}: LookerStudioPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!spreadsheetId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a spreadsheet above to enable Looker Studio connection.
      </p>
    );
  }

  const sheetUrl = getSpreadsheetUrl(spreadsheetId);
  const lookerUrl = getLookerStudioCreateUrl();
  const displayName = spreadsheetName ?? spreadsheetId;

  function handleCopy() {
    void navigator.clipboard.writeText(sheetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">Connected spreadsheet</p>
        <p className="mt-0.5 text-sm font-medium truncate">{displayName}</p>
      </div>

      <ol className="space-y-4">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            1
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">Verify your spreadsheet data</p>
            <p className="text-xs text-muted-foreground">
              Open the sheet and confirm the <strong>Ultrametrics</strong> tab
              has numeric values in the Cost, Clicks, Impressions, Revenue, and ROAS columns.
            </p>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-blue-600 hover:underline"
            >
              Open in Google Sheets ↗
            </a>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            2
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">Create a new Looker Studio report</p>
            <p className="text-xs text-muted-foreground">
              Click <strong>Create</strong> → <strong>Report</strong>, then choose{" "}
              <strong>Google Sheets</strong> as the data source.
            </p>
            <a
              href={lookerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-blue-600 hover:underline"
            >
              Open Looker Studio ↗
            </a>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            3
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">Connect your spreadsheet</p>
            <p className="text-xs text-muted-foreground">
              Paste the spreadsheet URL when prompted, then select the{" "}
              <strong>Ultrametrics</strong> sheet tab.
            </p>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy spreadsheet URL"}
            </Button>
          </div>
        </li>
      </ol>
    </div>
  );
}
