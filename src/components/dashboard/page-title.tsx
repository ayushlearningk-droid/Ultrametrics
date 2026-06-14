"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/connectors": "Connectors",
  "/dashboard/connectors/google": "Google Sheets",
  "/dashboard/connectors/google-ads": "Google Ads",
  "/dashboard/connectors/meta": "Meta Ads",
  "/dashboard/sync-jobs": "Sync Jobs",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
};

export function PageTitle() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Dashboard";
  return <h1 className="text-lg font-semibold">{title}</h1>;
}
