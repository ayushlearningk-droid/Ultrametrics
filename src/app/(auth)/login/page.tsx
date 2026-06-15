import { AuthSplit } from "@/components/auth/auth-split";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const safeRedirect =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";

  return (
    <AuthSplit
      eyebrow="Welcome back"
      title="Sign in to Mission Control."
      subtitle="Your AI is still watching your marketing. Pick up where you left off."
    >
      <LoginForm redirectTo={safeRedirect} />
    </AuthSplit>
  );
}
