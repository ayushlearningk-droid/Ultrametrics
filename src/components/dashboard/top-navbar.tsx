"use client";

import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/user-nav";
import { PageTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/database";

interface TopNavbarProps {
  user: User;
  onMobileMenuToggle: () => void;
}

export function TopNavbar({ user, onMobileMenuToggle }: TopNavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <PageTitle />
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <UserNav user={user} />
      </div>
    </header>
  );
}
