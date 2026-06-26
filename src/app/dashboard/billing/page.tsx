import { getSubscriptionByWorkspace } from "@/lib/data/dashboard";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { PLANS } from "@/lib/constants";
import { BillingActions } from "@/components/dashboard/billing-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Billing",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  const subscription = await getSubscriptionByWorkspace(workspaceId!);
  const currentPlan = PLANS.find((p) => p.id === subscription?.plan_id) ?? PLANS[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-2 md:px-6 lg:py-4">
      <header className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
        <p className="type-eyebrow text-foreground-muted">Subscription</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Billing
        </h2>
        <p className="max-w-2xl text-sm text-foreground-muted">
          Manage your subscription and payment methods.
        </p>
      </header>

      {params.success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          Subscription updated successfully.
        </div>
      )}
      {params.canceled && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Checkout was canceled. No changes were made.
        </div>
      )}

      <Card className="border-white/[0.08] bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Your workspace subscription details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold">{currentPlan.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentPlan.description}
              </p>
            </div>
            <Badge variant="brand">{subscription?.status ?? "trialing"}</Badge>
          </div>
          {subscription?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              Current period ends:{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
          <BillingActions
            workspaceId={workspaceId!}
            currentPlanId={subscription?.plan_id ?? "starter"}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.filter((p) => p.id !== "enterprise").map((plan) => (
          <Card
            key={plan.id}
            className={plan.id === currentPlan.id ? "border-brand/40 bg-brand/[0.07] ring-1 ring-brand/30" : "border-white/[0.08] bg-white/[0.03]"}
          >
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription>
                ${plan.priceMonthly}/mo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
