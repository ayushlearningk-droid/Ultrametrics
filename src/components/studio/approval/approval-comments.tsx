"use client";

/**
 * Production Approval Center — ApprovalComments (Sprint 63).
 * Comment thread + add (presentation state). Future mentions/notifications seam.
 */

import { useState } from "react";
import { MessageSquare, AtSign, Send } from "lucide-react";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useApproval } from "./approval-context";
import type { ApprovalItem } from "./approval-data";

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ApprovalComments({ item }: { item: ApprovalItem }) {
  const { addComment } = useApproval();
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    addComment(item.id, t);
    setText("");
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="flex items-center gap-2 type-eyebrow text-foreground-muted">
        <MessageSquare className="h-3.5 w-3.5 text-brand" /> Comments
      </h4>
      {item.comments.length === 0 ? (
        <p className="type-caption text-foreground-muted">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {item.comments.map((c) => {
            const Icon = EMPLOYEE_ICON[c.authorId];
            return (
              <div key={c.id} className="studio-card flex flex-col gap-1 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="studio-tile flex h-5 w-5 items-center justify-center text-foreground-muted">
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="type-caption font-semibold text-foreground">{employeeName(c.authorId)}</span>
                  <span className="ml-auto type-caption tabular-nums text-foreground-muted">{timeLabel(c.at)}</span>
                </div>
                <p className="type-caption text-foreground/90">{c.text}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="studio-glass flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          aria-disabled
          title="Mention (coming soon)"
          aria-label="Mention (coming soon)"
          className="studio-focusable flex h-5 w-5 cursor-default items-center justify-center text-foreground-muted/60 hover:text-foreground"
        >
          <AtSign className="h-3.5 w-3.5" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="min-w-0 flex-1 bg-transparent type-caption text-foreground outline-none placeholder:text-foreground-muted"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send comment"
          className="studio-focusable flex h-6 w-6 items-center justify-center rounded-[var(--studio-radius-sm)] text-brand transition-colors hover:bg-brand/10"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
