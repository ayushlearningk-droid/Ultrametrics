"use client";

/**
 * Ultrametrics — central keyboard shortcut manager (Sprint 6, Phase 2).
 *
 * One global `keydown` listener that drives an AI-native, Linear/Arc/Vercel-style
 * shortcut scheme. Supports three combo shapes via a single declarative array:
 *
 *   • Modifier combos   — "mod+k"  (Ctrl on Win/Linux, ⌘ on macOS)
 *   • Single keys       — "a", "n", "/", "?"
 *   • Chord sequences   — "g c"    (press G, then C within ~1s)
 *
 * Single-key and chord shortcuts are suppressed while a text input is focused
 * (so typing "a" in a field never opens Ask); modifier combos still fire there.
 * The listener binds once and reads the latest shortcuts through a ref, so the
 * caller can pass a freshly-built array each render without re-binding.
 */

import { useEffect, useRef } from "react";

export interface KeyboardShortcut {
  /** Combo spec: "mod+k" | single key like "a" / "/" / "?" | chord like "g c". */
  combo: string;
  /** Invoked when the combo matches. */
  handler: (event: KeyboardEvent) => void;
  /** Allow firing while a text input/contentEditable is focused (default false). */
  allowInInput?: boolean;
}

/** How long a chord prefix (e.g. "g") stays armed waiting for the next key. */
const CHORD_TIMEOUT_MS = 1000;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  // Keep the latest shortcuts without re-binding the listener every render.
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    let chordPrefix: string | null = null;
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    function clearChord() {
      chordPrefix = null;
      if (chordTimer) {
        clearTimeout(chordTimer);
        chordTimer = null;
      }
    }

    function handler(event: KeyboardEvent) {
      const editable = isEditableTarget(event.target);
      const hasMod = event.metaKey || event.ctrlKey;
      const shift = event.shiftKey;
      const key = event.key.toLowerCase();

      // Bare modifier presses never trigger anything.
      if (
        key === "control" ||
        key === "meta" ||
        key === "shift" ||
        key === "alt"
      ) {
        return;
      }

      // 1) Modifier combos ("mod+x") — fire even inside inputs.
      if (hasMod) {
        const combo = `mod+${key}`;
        for (const s of shortcutsRef.current) {
          if (s.combo === combo) {
            event.preventDefault();
            clearChord();
            s.handler(event);
            return;
          }
        }
        return; // a modified key is never a single-key/chord shortcut
      }

      // 1b) Shift + key combos ("shift+a"). Letters differ from their plain form
      // only by Shift; punctuation like "?" is its own key (handled as single).
      if (shift) {
        const combo = `shift+${key}`;
        for (const s of shortcutsRef.current) {
          if (s.combo === combo && (s.allowInInput || !editable)) {
            event.preventDefault();
            clearChord();
            s.handler(event);
            return;
          }
        }
      }

      // 2) Chord continuation: a prefix is armed, this is the second key.
      if (chordPrefix) {
        const combo = `${chordPrefix} ${key}`;
        clearChord();
        for (const s of shortcutsRef.current) {
          if (s.combo === combo && (s.allowInInput || !editable)) {
            event.preventDefault();
            s.handler(event);
            return;
          }
        }
        // No chord match — fall through; this key may itself be a shortcut/prefix.
      }

      // 3) Exact single-key match.
      for (const s of shortcutsRef.current) {
        if (s.combo === key && !s.combo.includes(" ")) {
          // A letter held with Shift is a distinct combo (Shift+A ≠ A); skip it
          // here so it can only match a "shift+<letter>" binding above.
          const isLetter = key.length === 1 && key >= "a" && key <= "z";
          if (isLetter && shift) continue;
          if (!s.allowInInput && editable) return;
          event.preventDefault();
          s.handler(event);
          return;
        }
      }

      // 4) Arm a chord prefix if any chord starts with this key (not while Shift).
      const startsChord = shortcutsRef.current.some(
        (s) => s.combo.includes(" ") && s.combo.split(" ")[0] === key
      );
      if (startsChord && !editable && !shift) {
        chordPrefix = key;
        chordTimer = setTimeout(clearChord, CHORD_TIMEOUT_MS);
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearChord();
    };
  }, []);
}
