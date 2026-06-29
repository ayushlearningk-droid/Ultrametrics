"use client";

/**
 * Outcome Engine — picker (Sprint 63J).
 *
 * Outcome-first entry: the Studio asks "What outcome do you want?" — never
 * "Create Video / Image / Avatar". Selecting an outcome assembles its plan.
 * Studio 2.0 tokens; reduced-motion safe.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Target } from "lucide-react";
import { staggerChildren, slideUp } from "@/lib/motion";
import { OUTCOMES } from "./outcomes-data";
import { useOutcome } from "./outcome-engine";

export function OutcomePicker() {
  const { selectOutcome } = useOutcome();
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Target className="h-3.5 w-3.5 text-brand" />
          Outcome Engine
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          What outcome do you want?
        </h1>
        <p className="max-w-xl type-body text-foreground-muted">
          Choose a result — the team decides the images, videos, voice, and campaign for you.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerChildren}
        initial={reduce ? false : "hidden"}
        animate="visible"
      >
        {OUTCOMES.map((o) => {
          const Icon = o.icon;
          return (
            <motion.button
              key={o.id}
              variants={slideUp}
              type="button"
              onClick={() => selectOutcome(o.id)}
              className="studio-card studio-card-interactive studio-focusable flex flex-col items-start gap-3 p-5 text-left"
            >
              <div className="studio-tile flex h-12 w-12 items-center justify-center text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="type-body font-semibold text-foreground">{o.label}</p>
                <p className="type-caption text-foreground-muted">{o.description}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
