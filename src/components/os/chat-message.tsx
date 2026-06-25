"use client";

/**
 * Ask Ultrametrics — chat message (V2; premium response chrome Sprint 36).
 *
 * User turns: right-aligned, elevated, dominant. Assistant turns: rendered via
 * AiResponse (existing structured cards), with additive premium chrome — a
 * progressive ThinkingStatus before text begins (driven by the real tool phase)
 * and a copy/collapse toolbar once the answer is complete. No redesign of the
 * card renderer; everything here is additive presentation.
 */

import { useState } from "react";
import { AiResponse } from "@/components/os/ai-response";
import { ThinkingStatus } from "@/components/os/ai/thinking-status";
import { CopyButton } from "@/components/os/ai/insight-cards";
import type { ActionRecommendation } from "@/lib/ai/types";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  /** When true, show streaming chrome (thinking status / cursor). */
  streaming?: boolean;
  /** Interactive CTA handler for assistant recommendation cards. */
  onPrompt?: (text: string) => void;
  /** Sprint 13B: structured recommendations for THIS assistant turn (or undefined). */
  recommendations?: ActionRecommendation[];
  /** Sprint 36: raw tool name currently executing (for the thinking status). */
  toolPhase?: string | null;
}

export function ChatMessage({
  role,
  content,
  streaming,
  onPrompt,
  recommendations,
  toolPhase,
}: ChatMessageProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-emerald-400/25 bg-emerald-400/[0.10] px-4 py-2.5 text-[15px] font-semibold leading-relaxed text-foreground shadow-lg shadow-emerald-500/10">
          <span className="whitespace-pre-wrap">{content}</span>
        </div>
      </div>
    );
  }

  const hasText = content.trim().length > 0;

  // Before any text arrives, show the progressive thinking status (real phase).
  if (streaming && !hasText) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] min-w-0">
          <ThinkingStatus toolPhase={toolPhase} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] min-w-0">
        {collapsed ? (
          <p className="type-caption italic text-foreground-muted">
            Response collapsed.
          </p>
        ) : (
          <AiResponse
            content={content}
            onPrompt={onPrompt}
            recommendations={recommendations}
          />
        )}
        {streaming && (
          <span className="ml-0.5 animate-pulse text-foreground/70">▋</span>
        )}

        {/* Copy / collapse chrome — only once the answer is complete. */}
        {!streaming && hasText && (
          <div className="mt-2 flex items-center gap-1">
            <CopyButton text={content} label="Copy response" />
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              className="rounded-md px-1.5 py-1 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground"
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
