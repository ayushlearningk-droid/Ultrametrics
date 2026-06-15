"use client";

import { useEffect, useRef } from "react";

/**
 * L0 environment with subtle cursor-reactive parallax.
 * The two ambient light pools (blue / violet) drift a few pixels toward
 * the opposite side of the cursor, creating depth without motion sickness.
 *
 * Performance: transform-only (GPU-composited), one rAF tick per frame,
 * passive listener, disabled under prefers-reduced-motion. No blur added
 * here beyond the existing env-layer CSS — blur-layer budget untouched.
 */
export function EnvironmentLayer() {
  const blueRef = useRef<HTMLDivElement>(null);
  const violetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    // Skip on touch / coarse pointers — no cursor to react to
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    function onMove(e: MouseEvent) {
      // normalized -0.5..0.5 from viewport center
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      // light pools drift opposite the cursor, max ~18px — very subtle
      tx = -nx * 18;
      ty = -ny * 18;
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick() {
      raf = 0;
      // ease toward target (lag = depth)
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      if (blueRef.current) {
        blueRef.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      }
      if (violetRef.current) {
        // violet drifts slightly more — parallax separation between layers
        violetRef.current.style.transform = `translate3d(${cx * 1.6}px, ${cy * 1.6}px, 0)`;
      }
      // keep settling until close enough
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(tick);
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="env-layer" aria-hidden>
        <div ref={blueRef} className="env-pool env-pool-blue" />
        <div ref={violetRef} className="env-pool env-pool-violet" />
      </div>
      <div className="env-vignette" aria-hidden />
    </>
  );
}
