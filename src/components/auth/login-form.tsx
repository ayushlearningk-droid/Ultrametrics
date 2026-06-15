"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid input");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/[0.08] px-3.5 py-2.5 type-caption text-danger">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email" className="type-caption text-foreground-muted">
          Email
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="type-caption text-foreground-muted">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="type-caption text-brand/80 transition-colors hover:text-brand"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
      <p className="text-center type-caption text-foreground-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand transition-colors hover:text-brand/80">
          Sign up
        </Link>
      </p>
    </form>
  );
}
