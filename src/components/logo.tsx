import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-lg shadow-brand/30">
        <BarChart3 className="h-5 w-5" />
      </span>
      {showText && (
        <span className="text-lg tracking-tight">
          Ultra<span className="text-brand">metrics</span>
        </span>
      )}
      <span className="sr-only">{APP_NAME}</span>
    </Link>
  );
}
