"use client";

/**
 * AI Employees Runtime — conversation bus (Sprint 63H).
 *
 * Public, deterministic message stream between employees. New messages animate
 * in; the latest is kept in view. Studio 2.0 tokens; reduced-motion safe.
 */

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Radio } from "lucide-react";
import { slideUp } from "@/lib/motion";
import { EMPLOYEE_ICON, employeeName } from "./employees-data";
import { useEmployees } from "./employees-context";

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour12: false });
}

export function ConversationBus() {
  const { messages } = useEmployees();
  const reduce = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [messages.length, reduce]);

  return (
    <div className="studio-surface-raised flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <Radio className="h-3.5 w-3.5 text-brand" />
        <span className="type-eyebrow text-foreground-muted">Conversation Bus</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="px-1 type-caption text-foreground-muted">Waiting for the team to begin…</p>
        ) : (
          messages.map((m) => {
            const FromIcon = EMPLOYEE_ICON[m.fromId];
            return (
              <motion.div
                key={m.id}
                variants={slideUp}
                initial={reduce ? false : "hidden"}
                animate="visible"
                className="studio-card flex flex-col gap-1.5 p-3"
              >
                <div className="flex items-center gap-1.5">
                  <span className="studio-tile flex h-5 w-5 items-center justify-center text-foreground-muted">
                    <FromIcon className="h-3 w-3" />
                  </span>
                  <span className="type-caption font-semibold text-foreground">{employeeName(m.fromId)}</span>
                  {m.toId && (
                    <>
                      <ArrowRight className="h-3 w-3 text-foreground-muted" />
                      <span className="type-caption text-foreground-muted">{employeeName(m.toId)}</span>
                    </>
                  )}
                  <span className="ml-auto type-caption tabular-nums text-foreground-muted">{timeLabel(m.at)}</span>
                </div>
                <p className="type-body text-foreground/90">{m.text}</p>
              </motion.div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
