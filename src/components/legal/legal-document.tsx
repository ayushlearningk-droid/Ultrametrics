"use client";

/**
 * Legal document shell (Sprint G-01) — premium, dependency-free reading layout.
 *
 * Centered ≤900px column, sticky desktop table of contents, top scroll-progress
 * bar, and clean section dividers. Theme-aware via existing tokens; respects
 * reduced motion (smooth scroll is gated by the global media query). No external
 * libraries. Presentation only.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function LegalDocument({
  title,
  intro,
  lastUpdated,
  sections,
}: {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Scroll progress bar (transform/width only — no layout cost).
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section highlighting for the table of contents.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Scroll progress */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-brand"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden
      />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-[hsl(var(--background))]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Back to home" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1100px] gap-10 px-4 py-12 sm:px-6 lg:py-16">
        {/* Sticky table of contents (desktop) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label="Table of contents" className="sticky top-24">
            <p className="type-eyebrow text-foreground-muted">On this page</p>
            <ul className="mt-3 flex flex-col gap-1 border-l border-border">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      "-ml-px block border-l-2 py-1 pl-3 type-caption transition-colors",
                      activeId === s.id
                        ? "border-brand font-semibold text-foreground"
                        : "border-transparent text-foreground-muted hover:text-foreground"
                    )}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Document */}
        <article className="min-w-0 max-w-[900px] flex-1">
          <div className="flex flex-col gap-3 pb-10">
            <span className="type-eyebrow text-foreground-muted">Legal</span>
            <h1 className="type-display text-foreground">{title}</h1>
            <p className="type-body max-w-2xl text-foreground-muted">{intro}</p>
            <p className="type-caption text-foreground-muted">
              Last updated · {lastUpdated}
            </p>
          </div>

          <div className="flex flex-col">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                ref={(el) => {
                  if (el) sectionRefs.current.set(s.id, el);
                }}
                className={cn(
                  "scroll-mt-24 border-t border-border py-8 first:border-0 first:pt-0",
                  i === 0 && "first:pt-0"
                )}
              >
                <div className="flex items-baseline gap-3">
                  <span className="type-caption tabular-nums text-foreground-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="type-body text-[17px] font-semibold tracking-tight text-foreground">
                    {s.title}
                  </h2>
                </div>
                <div className="legal-prose mt-3 flex flex-col gap-3">{s.content}</div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

/** Shared prose helpers so both documents read consistently. */
export function P({ children }: { children: React.ReactNode }) {
  return <p className="type-body leading-relaxed text-foreground/80">{children}</p>;
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((x, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground-muted" />
          <span className="type-body leading-relaxed text-foreground/80">{x}</span>
        </li>
      ))}
    </ul>
  );
}
