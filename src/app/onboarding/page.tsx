import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardContext } from "@/lib/data/workspaces";

export const metadata = {
  title: "Workspace setup",
};

export default async function OnboardingPage() {
  const context = await getDashboardContext();

  if (!context?.authUser) {
    redirect("/login");
  }

  if (context.currentWorkspaceId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Finish setting up your workspace</CardTitle>
          <CardDescription>
            You&apos;re signed in, but no workspace is linked to your account yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This usually means the Supabase database migrations haven&apos;t been
            applied yet.
          </p>
          <ol className="list-inside list-decimal space-y-2">
            <li>Open your Supabase project SQL Editor</li>
            <li>
              Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                supabase/migrations/20250601000000_initial_schema.sql
              </code>
            </li>
            <li>
              Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                supabase/migrations/20250601000001_rls_policies.sql
              </code>
            </li>
            <li>Sign out and sign in again, or create a new account</li>
          </ol>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/login">Back to sign in</Link>
            </Button>
            <Button variant="brand" asChild>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Supabase
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
