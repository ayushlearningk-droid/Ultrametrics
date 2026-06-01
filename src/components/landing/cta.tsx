import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CtaSection() {
  return (
    <section id="cta" className="border-t py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-brand/10 via-background to-background p-8 md:p-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to unify your marketing data?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join teams who ship client reports 10× faster with automated
              connectors and workspace isolation.
            </p>
            <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Input
                type="email"
                placeholder="you@company.com"
                className="h-12 max-w-sm bg-background"
                aria-label="Work email"
              />
              <Button variant="brand" size="lg" asChild className="h-12">
                <Link href="/signup">
                  Request demo
                  <ArrowRight className="ml-1" />
                </Link>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
