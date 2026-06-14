"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAppOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid input");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${getAppOrigin()}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (success) {
    return (
      <div className="rounded-lg border border-brand/30 bg-brand/[0.07] px-4 py-3.5 text-center type-body text-brand">
        Account created — taking you to your dashboard…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/[0.08] px-3.5 py-2.5 type-caption text-danger">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="type-caption text-foreground-muted">
          Full name
        </Label>
        <Input
          id="fullName"
          name="fullName"
          placeholder="Jane Smith"
          required
          autoComplete="name"
          className="h-11 bg-white/[0.02]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="type-caption text-foreground-muted">
          Work email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          autoComplete="email"
          className="h-11 bg-white/[0.02]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="type-caption text-foreground-muted">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="h-11 bg-white/[0.02]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="type-caption text-foreground-muted">
          Confirm password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="h-11 bg-white/[0.02]"
        />
      </div>
      <Button
        type="submit"
        variant="brand"
        className="h-11 w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
      <p className="text-center type-caption text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand transition-colors hover:text-brand/80">
          Sign in
        </Link>
      </p>
    </form>
  );
}
