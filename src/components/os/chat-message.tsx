/**
 * Ask Ultrametrics — chat message (V2, Step 2).
 *
 * Renders one conversation turn. User turns are visually dominant: right-aligned,
 * larger + bold, in an elevated card capped at 85% width. Assistant turns are
 * left-aligned and rendered as markdown (headings, lists, tables, code) via the
 * Markdown component, with an optional streaming cursor.
 *
 * Pure presentation — no state, no data. NO drawer / provider / shell wiring.
 */

import { Markdown } from "@/components/os/markdown";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  /** When true, show a blinking cursor after the (assistant) content. */
  streaming?: boolean;
}

export function ChatMessage({ role, content, streaming }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-emerald-400/25 bg-emerald-400/[0.10] px-4 py-2.5 text-[15px] font-semibold leading-relaxed text-foreground shadow-lg shadow-emerald-500/10">
          <span className="whitespace-pre-wrap">{content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] min-w-0">
        <Markdown>{content}</Markdown>
        {streaming && (
          <span className="ml-0.5 animate-pulse text-foreground/70">▋</span>
        )}
      </div>
    </div>
  );
}
