import { AuthSplit } from "@/components/auth/auth-split";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <AuthSplit
      eyebrow="Start free"
      title="Put an AI on your marketing."
      subtitle="14-day trial, no credit card. Connect a source and your Mission Control goes live in minutes."
    >
      <SignupForm />
    </AuthSplit>
  );
}
