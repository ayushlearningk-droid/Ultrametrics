import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  google_ads_not_configured:
    "Google Ads is not configured. Add GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_MCC_CUSTOMER_ID to your environment.",
  missing_workspace: "No workspace selected. Switch workspace and try again.",
  forbidden: "You do not have access to connect sources for this workspace.",
  invalid_state:
    "OAuth session expired or was invalid. Please try connecting again.",
  invalid_callback: "Google returned an incomplete response. Try again.",
  google_ads_denied: "Google Ads authorisation was cancelled or denied.",
  token_exchange:
    "Could not exchange the authorisation code for an access token. Check your Google OAuth client settings and redirect URI.",
};

type GoogleAdsOAuthAlertsProps = {
  oauth?: string;
  error?: string;
  reason?: string;
};

export function GoogleAdsOAuthAlerts({
  oauth,
  error,
  reason,
}: GoogleAdsOAuthAlertsProps) {
  if (oauth === "success") {
    return (
      <div
        className={cn(
          "flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"
        )}
        role="status"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div>
          <p className="font-medium text-foreground">Google Ads connected</p>
          <p className="mt-1 text-muted-foreground">
            Authorisation successful. Select an ad account to complete the
            connection.
          </p>
        </div>
      </div>
    );
  }

  if (!error) {
    return null;
  }

  const message =
    ERROR_MESSAGES[error] ??
    "Something went wrong during Google Ads authorisation. Please try again.";

  return (
    <div
      className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-foreground">Connection failed</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
        {reason ? (
          <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
        ) : null}
      </div>
    </div>
  );
}
