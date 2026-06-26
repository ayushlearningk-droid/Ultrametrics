import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/data/dashboard";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { WorkspaceSettings } from "@/components/dashboard/workspace-settings";
import { WorkspaceMemoryPanel } from "@/components/dashboard/workspace-memory-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getUserProfile(user!.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-2 md:px-6 lg:py-4">
      <header className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
        <p className="type-eyebrow text-foreground-muted">Workspace controls</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h2>
        <p className="max-w-2xl text-sm text-foreground-muted">
          Manage your profile and account preferences.
        </p>
      </header>

      <Card className="border-white/[0.08] bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          {profile && <ProfileForm user={profile} />}
        </CardContent>
      </Card>

      <div className="space-y-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Workspace
        </h2>
        <p className="text-sm text-foreground-muted">
          Feature flags, preferences, and notifications for this workspace.
        </p>
      </div>
      <WorkspaceSettings />
      <WorkspaceMemoryPanel />
    </div>
  );
}
