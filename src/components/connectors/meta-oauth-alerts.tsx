import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  meta_not_configured:
    "Meta OAuth is not configured. Add META_APP_ID and META_APP_SECRET to your environment.",
  missing_workspace: "No workspace selected. Switch workspace and try again.",
  forbidden: "You do not have access to connect sources for this workspace.",
  invalid_state:
    "OAuth session expired or was invalid. Please try connecting again.",
  invalid_callback: "Facebook returned an incomplete response. Try again.",
  meta_denied: "Facebook login was cancelled or denied.",
  token_exchange:
    "Could not exchange the authorization code for an access token. Check Meta app settings and redirect URI.",
};

type MetaOAuthAlertsProps = {
  oauth?: string;
  error?: string;
  reason?: string;
};

export function MetaOAuthAlerts({ oauth, error, reason }: MetaOAuthAlertsProps) {
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
          <p className="font-medium text-foreground">Facebook connected</p>
          <p className="mt-1 text-muted-foreground">
            Your access token is stored temporarily. Ad account selection will be
            available in the next step.
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
    "Something went wrong during Facebook login. Please try again.";

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
