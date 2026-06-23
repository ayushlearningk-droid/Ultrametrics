/**
 * Action Queue — page (Sprint 8, Foundation).
 *
 * Server route that resolves the Sidebar "Actions" item and renders the
 * Pending Actions surface. The surface is a client component driven entirely by
 * MOCK data with local-only state — no backend, no DB, no API calls here.
 */

import { PendingActions } from "@/components/dashboard/pending-actions";

export const metadata = { title: "Actions" };

export default function ActionsPage() {
  return <PendingActions />;
}
