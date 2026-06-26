import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Home,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { CopyEmailButton } from "@/components/contact/copy-email-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Ultrametrics",
  description: "Get in touch with Ultrametrics for support, billing, privacy, and product questions.",
};

const purposeItems = [
  "General support",
  "Google Ads API",
  "Meta API",
  "Privacy",
  "Billing",
  "Technical issues",
  "Business inquiries",
];

const faqs = [
  {
    question: "How quickly will I hear back?",
    answer: "We typically respond within 24–48 hours during normal business days.",
  },
  {
    question: "What kinds of questions can I send?",
    answer: "You can reach out about onboarding, product usage, API access, billing, privacy, and general support.",
  },
  {
    question: "Do you offer support for integrations?",
    answer: "Yes. We can help with Google Ads, Meta, privacy, and technical setup questions related to the platform.",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.85))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_38%),linear-gradient(135deg,_rgba(2,6,23,0.98),_rgba(2,8,23,0.95))]">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Back to home
          </Link>
          <Badge variant="brand" className="px-3 py-1">
            Contact · {APP_NAME}
          </Badge>
        </header>

        <main className="pb-20 pt-8 sm:pt-10">
          <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-background/70 px-6 py-14 shadow-[0_30px_120px_-40px_rgba(16,185,129,0.35)] backdrop-blur-xl sm:px-8 lg:px-12 lg:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
            <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <Badge variant="success" className="mb-6 px-3 py-1">
                  Support · Usually within 24–48 hours
                </Badge>
                <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Reach the {APP_NAME} team
                </h1>
                <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                  Whether you need help with the product, integrations, privacy, billing, or general questions, we’re here to help.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="brand" size="lg" asChild>
                    <Link href={`mailto:${CONTACT_EMAIL}`}>
                      Email us
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/">
                      <Home className="mr-1 h-4 w-4" />
                      Back to Home
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MessageSquareText className="h-4 w-4 text-emerald-600" />
                      Fast response
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Most enquiries receive a reply within 24–48 hours.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Secure and clear
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      We cover support, privacy, integrations, and billing questions.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="border-emerald-500/20 bg-card/80 shadow-xl shadow-emerald-500/10">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-emerald-600">Contact details</p>
                      <CardTitle className="mt-2 text-xl">Get in touch</CardTitle>
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-600">
                      <Mail className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="group flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="mt-1 text-sm text-muted-foreground">{CONTACT_EMAIL}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-600 transition-transform group-hover:translate-x-0.5">
                      Open
                    </span>
                  </a>

                  <CopyEmailButton />

                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Product</span>
                      <span className="font-medium text-foreground">{APP_NAME}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Response time</span>
                      <span className="font-medium text-foreground">24–48 hours</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Purpose</span>
                      <span className="font-medium text-foreground">General support</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mt-16 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-8 shadow-sm backdrop-blur-sm">
              <Badge variant="brand" className="mb-4 px-3 py-1">
                What we can help with
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight">Support topics</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                The team can assist with product questions, Google Ads and Meta API requests, privacy concerns, billing questions, and technical issues.
              </p>
              <ul className="mt-6 space-y-3">
                {purposeItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-8 shadow-sm backdrop-blur-sm">
              <Badge variant="success" className="mb-4 px-3 py-1">
                Frequently asked questions
              </Badge>
              <div className="mt-6 space-y-3">
                {faqs.map((faq) => (
                  <div key={faq.question} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-foreground">{faq.question}</p>
                      <div className="rounded-full border border-border/60 p-1 text-muted-foreground">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
