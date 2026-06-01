import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start your 14-day free trial — no credit card required"
    >
      <SignupForm />
    </AuthCard>
  );
}
