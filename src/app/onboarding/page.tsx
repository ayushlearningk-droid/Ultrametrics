import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardContext } from "@/lib/data/workspaces";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/providers";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata = {
  title: "Welcome to Ultrametrics",
};

// Priority order for the connect step
const PRIORITY = ["meta_ads", "google_ads", "google_sheets"] as const;

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("__dev_screenshot")?.value === "1";

  // Demo preview (screenshot mode) — renders the flow without real auth
  if (isDemo) {
    const options = PRIORITY.map((id) => {
      const meta = CONNECTOR_PROVIDERS.find((p) => p.id === id)!;
      return {
        id,
        name: meta.name,
        description: meta.description,
        href: meta.href ?? "/dashboard/connectors",
        connected: id === "meta_ads",
        needsAttention: id === "google_ads",
      };
    });
    return (
      <OnboardingFlow
        userName="Ayush"
        workspaceName="Acme Corp"
        connectors={options}
      />
    );
  }

  const context = await getDashboardContext();

  if (!context?.authUser) {
    redirect("/login");
  }

  const wsId = context.currentWorkspaceId;
  const workspace =
    context.workspaces.find((w) => w.id === wsId) ?? context.workspaces[0];

  // Read existing connector statuses (read-only) to drive card states
  const connectors = wsId ? await getConnectorsByWorkspace(wsId) : [];
  const byProvider = new Map(connectors.map((c) => [c.provider, c]));

  const firstName = (context.profile.full_name ?? "").trim().split(" ")[0] ?? "";

  const options = PRIORITY.map((id) => {
    const meta = CONNECTOR_PROVIDERS.find((p) => p.id === id)!;
    const existing = byProvider.get(id);
    return {
      id,
      name: meta.name,
      description: meta.description,
      href: meta.href ?? "/dashboard/connectors",
      connected: existing?.status === "active",
      needsAttention:
        existing?.status === "error" || existing?.status === "disconnected",
    };
  });

  return (
    <OnboardingFlow
      userName={firstName}
      workspaceName={workspace?.name ?? "Your workspace"}
      connectors={options}
    />
  );
}
