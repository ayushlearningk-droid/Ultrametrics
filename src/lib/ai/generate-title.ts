/**
 * Ask Ultrametrics — AI conversation title generator (P1).
 *
 * One-shot, best-effort title generation: given a conversation's first user
 * message, return a concise 4–6 word executive-style title (e.g. "Why did my
 * ROAS drop yesterday?" → "ROAS Drop Investigation"). Uses the cheapest/fastest
 * model — this is a throwaway summarization, not a reasoning task.
 *
 * Never throws. Any failure (missing key, model error, empty/garbage output)
 * returns null so the caller simply keeps the existing placeholder title.
 */

import { getAnthropicClient } from "@/lib/ai/anthropic";

/** Cheapest/fastest current model — ample for a 4–6 word title. */
const TITLE_MODEL = "claude-haiku-4-5-20251001" as const;

/** Token cap — a 4–6 word title needs only a handful of tokens. */
const MAX_OUTPUT_TOKENS = 24;

/** Cap on the input we send (titles don't need the whole message). */
const INPUT_MAX_CHARS = 2000;

/** Output guards. */
const MAX_TITLE_WORDS = 6;
const MAX_TITLE_CHARS = 60;

const SYSTEM_PROMPT =
  "You write concise, professional, executive-style titles for marketing " +
  "analytics conversations. Given the user's first message, reply with ONLY a " +
  "4–6 word Title Case summary — no quotes, no trailing punctuation, no " +
  "preamble. Examples: \"Why did my ROAS drop yesterday?\" → ROAS Drop " +
  "Investigation. \"Which campaigns should I scale?\" → Campaign Scaling " +
  "Analysis.";

/** Trim quotes/punctuation/whitespace and cap to a sane title length. */
function sanitizeTitle(raw: string): string | null {
  let t = raw.trim();
  // Strip a single layer of wrapping quotes.
  t = t.replace(/^["'`]+|["'`]+$/g, "").trim();
  // Drop trailing sentence punctuation.
  t = t.replace(/[.!?,;:]+$/g, "").trim();
  // Collapse internal whitespace/newlines.
  t = t.replace(/\s+/g, " ");
  if (!t) return null;
  // Cap words, then characters.
  const words = t.split(" ");
  if (words.length > MAX_TITLE_WORDS) t = words.slice(0, MAX_TITLE_WORDS).join(" ");
  if (t.length > MAX_TITLE_CHARS) t = t.slice(0, MAX_TITLE_CHARS).trim();
  return t || null;
}

/**
 * Generate a title from the first user message. Returns null on any failure or
 * if the model produces nothing usable.
 */
export async function generateConversationTitle(
  userMessage: string
): Promise<string | null> {
  const input = userMessage.trim().slice(0, INPUT_MAX_CHARS);
  if (!input) return null;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: TITLE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: input }],
    });

    const text = response.content
      .filter((block): block is Extract<typeof block, { type: "text" }> =>
        block.type === "text"
      )
      .map((block) => block.text)
      .join(" ");

    return sanitizeTitle(text);
  } catch {
    // Best-effort: caller keeps the existing placeholder title.
    return null;
  }
}
