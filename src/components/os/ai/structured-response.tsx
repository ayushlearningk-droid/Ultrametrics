"use client";

/**
 * Structured AI Response Renderer (Sprint 36).
 *
 * Reusable renderer for the structured outputs of the reasoning + creative
 * engines. Renders only the sections that have content (graceful hide), with
 * a header (confidence badge, copy-full, expand/collapse-all) and per-section
 * collapse + copy. Token-only, additive — the foundation the future Creative
 * Studio / Media Buyer / AI Marketing Brain renders through. Not wired into the
 * live LLM chat stream (which renders markdown via AiResponse); this consumes
 * engine JSON directly.
 */

import { useCallback, useMemo, useState } from "react";
import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type { CreativeStrategy, CreativeBrief } from "@/lib/ai/creative/types";
import {
  CollapsibleSection,
  CopyButton,
  ConfidenceBadge,
  ExecutiveSummaryCard,
  DiagnosisCard,
  EvidenceCard,
  BusinessImpactCard,
  BulletListCard,
  PrioritizedActionsCard,
  CreativeStrategyCard,
  CreativeBriefCard,
} from "./insight-cards";

export interface StructuredResponseProps {
  reasoning?: ReasoningResult;
  creativeStrategy?: CreativeStrategy;
  creativeBrief?: CreativeBrief;
}

interface Section {
  key: string;
  title: string;
  copyText: string;
  node: React.ReactNode;
}

export function StructuredResponse({
  reasoning,
  creativeStrategy,
  creativeBrief,
}: StructuredResponseProps) {
  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    if (reasoning) {
      const r = reasoning;
      if (r.executiveSummary)
        out.push({
          key: "summary",
          title: "Executive Summary",
          copyText: r.executiveSummary,
          node: <ExecutiveSummaryCard text={r.executiveSummary} />,
        });
      if (r.diagnosis)
        out.push({
          key: "diagnosis",
          title: "Diagnosis",
          copyText: r.diagnosis,
          node: <DiagnosisCard text={r.diagnosis} />,
        });
      if (r.evidence.length > 0)
        out.push({
          key: "evidence",
          title: "Evidence",
          copyText: r.evidence.join("\n"),
          node: <EvidenceCard items={r.evidence} />,
        });
      if (r.businessImpact)
        out.push({
          key: "impact",
          title: "Business Impact",
          copyText: r.businessImpact.summary,
          node: <BusinessImpactCard impact={r.businessImpact} />,
        });
      if (r.risks.length > 0)
        out.push({
          key: "risks",
          title: "Risks",
          copyText: r.risks.join("\n"),
          node: <BulletListCard items={r.risks} />,
        });
      if (r.opportunities.length > 0)
        out.push({
          key: "opportunities",
          title: "Opportunities",
          copyText: r.opportunities.join("\n"),
          node: <BulletListCard items={r.opportunities} />,
        });
      if (r.prioritizedActions.length > 0)
        out.push({
          key: "actions",
          title: "Prioritized Actions",
          copyText: r.prioritizedActions.map((a) => `${a.priority}: ${a.action}`).join("\n"),
          node: <PrioritizedActionsCard actions={r.prioritizedActions} />,
        });
      if (r.prioritizedActions[0])
        out.push({
          key: "next",
          title: "Next Action",
          copyText: r.prioritizedActions[0].action,
          node: (
            <p className="type-body text-foreground/90">
              Start with: <span className="font-semibold">{r.prioritizedActions[0].action}</span>
            </p>
          ),
        });
    }
    if (creativeStrategy)
      out.push({
        key: "creative-strategy",
        title: "Creative Strategy",
        copyText: `${creativeStrategy.actions.join(", ")} — ${creativeStrategy.testRecommendation}`,
        node: <CreativeStrategyCard strategy={creativeStrategy} />,
      });
    if (creativeBrief)
      out.push({
        key: "creative-brief",
        title: "Creative Brief",
        copyText: [
          creativeBrief.executiveGoal,
          creativeBrief.problem,
          creativeBrief.creativeDirection,
          creativeBrief.cta,
        ].join("\n"),
        node: <CreativeBriefCard brief={creativeBrief} />,
      });
    return out;
  }, [reasoning, creativeStrategy, creativeBrief]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(
    () => setCollapsed(new Set(sections.map((s) => s.key))),
    [sections]
  );

  if (sections.length === 0) return null;

  const fullText = sections.map((s) => `## ${s.title}\n${s.copyText}`).join("\n\n");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {reasoning ? (
          <ConfidenceBadge level={reasoning.confidence} />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={collapsed.size === 0 ? collapseAll : expandAll}
            className="rounded-md px-1.5 py-1 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground"
          >
            {collapsed.size === 0 ? "Collapse all" : "Expand all"}
          </button>
          <CopyButton text={fullText} label="Copy all" />
        </div>
      </div>

      {sections.map((s) => (
        <CollapsibleSection
          key={s.key}
          title={s.title}
          copyText={s.copyText}
          collapsed={collapsed.has(s.key)}
          onToggle={() => toggle(s.key)}
        >
          {s.node}
        </CollapsibleSection>
      ))}
    </div>
  );
}
