import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthPreview } from "@/components/auth/auth-preview";

interface AuthSplitProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Premium split-screen auth shell.
 * Left  — brand + heading + value prop + form (single column on mobile).
 * Right — live spatial product preview (hidden below lg).
 * Reuses the app environment language: ambient blue/violet light + near-black.
 */
export function AuthSplit({ eyebrow, title, subtitle, children }: AuthSplitProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-0 text-foreground">
      {/* ── L0 environment ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, hsl(240 20% 6%) 0%, hsl(240 18% 4%) 45%, hsl(240 22% 2.5%) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(50% 50% at 10% 8%, hsl(var(--amb-blue) / 0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-[1] grid min-h-screen lg:grid-cols-2">
        {/* ── LEFT · form ──────────────────────────────────────────── */}
        <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-14 xl:px-20">
          {/* brand */}
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex">
              <Logo />
            </Link>
            <Link
              href="/"
              className="type-caption text-foreground-muted transition-colors hover:text-foreground"
            >
              ← Back to site
            </Link>
          </div>

          {/* form block, vertically centered */}
          <div className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-sm py-10">
              <p className="type-eyebrow text-brand/80">{eyebrow}</p>
              <h1 className="mt-3 type-display text-balance">{title}</h1>
              <p className="mt-2 type-body text-foreground-muted">{subtitle}</p>

              <div className="mt-8">{children}</div>

              {/* quiet trust row — reduces emptiness without overwhelming */}
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.05] pt-5">
                {["SOC 2 Type II", "No credit card", "Cancel anytime"].map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 type-caption text-foreground-muted/55"
                  >
                    <span className="h-[5px] w-[5px] rounded-full bg-brand/60" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* footer */}
          <p className="type-caption text-foreground-muted/45">
            © {new Date().getFullYear()} Ultrametrics · The AI marketing OS
          </p>
        </div>

        {/* ── RIGHT · product preview (desktop only) ───────────────── */}
        <div className="relative hidden border-l border-white/[0.05] lg:block">
          <AuthPreview />
        </div>
      </div>
    </div>
  );
}
