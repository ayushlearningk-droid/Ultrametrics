/**
 * Ask Ultrametrics — markdown renderer (V2, Step 1).
 *
 * Renders AI message content as GitHub-flavored markdown (headings, lists,
 * GFM tables, bold/italic, inline + block code) themed for the dark dashboard.
 * Raw HTML is intentionally NOT enabled (no rehype-raw): tool output echoes
 * provider data (campaign names, ad copy), so it must render as text, never as
 * markup. Pure presentation — no state, no data fetching.
 */

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-[17px] font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-[15px] font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-[14px] font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-[13px] font-semibold text-foreground first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-2 text-[13px] leading-relaxed text-foreground/80 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-foreground/80 marker:text-foreground-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-foreground/80 marker:text-foreground-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand underline underline-offset-2 hover:text-brand/80"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-white/15 pl-3 text-[13px] italic text-foreground-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-white/[0.08]" />,
  code: ({ className, children }) => {
    // Block code carries a `language-*` class (from ```lang fences); inline
    // code does not. Block code renders bare and inherits the <pre> box below.
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      return <code className={cn("font-mono text-[12px]", className)}>{children}</code>;
    }
    return (
      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 text-[12px] leading-relaxed text-foreground/80">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/[0.08]">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.04] text-foreground">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-white/[0.06] last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top text-foreground/80">{children}</td>
  ),
};

export interface MarkdownProps {
  children: string;
  className?: string;
}

/** Render a markdown string with GFM support, themed for the dark UI. */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("text-[13px] text-foreground/80", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
