import {
  CreditCard,
  Download,
  Layers,
  Plug,
  RefreshCw,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { LANDING_FEATURES } from "@/lib/constants";

const iconMap: Record<string, LucideIcon> = {
  Plug,
  RefreshCw,
  Layers,
  CreditCard,
  Shield,
  Download,
};

export function FeaturesSection() {
  return (
    <section id="features" className="border-t bg-muted/30 py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run data ops
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for agencies and in-house teams who live in dashboards — not
            manual exports.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border bg-card p-6 transition-all hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
