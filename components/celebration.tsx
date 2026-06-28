"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { useReducedMotion } from "motion/react";
import type { CelebrationSignal } from "@/lib/store";

const COZY_COLORS = ["#F7D6D0", "#F6E7A6", "#C9DCC4", "#C7DDF5", "#D8C7F5", "#E8C9B8"];

/** Rare milestone celebration — soft, cozy, brief. Honors reduced motion. */
export function Celebration({ signal }: { signal: CelebrationSignal | null }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!signal || reduce) return;

    const fire = () => {
      const common = {
        colors: COZY_COLORS,
        disableForReducedMotion: true,
        scalar: 0.95,
        ticks: 160,
      };
      if (signal.variant === "balloons") {
        confetti({
          ...common,
          particleCount: 26,
          startVelocity: 34,
          gravity: 0.5,
          spread: 70,
          origin: { y: 0.9 },
          shapes: ["circle"],
        });
      } else {
        confetti({ ...common, particleCount: 34, spread: 64, startVelocity: 28, origin: { y: 0.78 } });
        setTimeout(
          () =>
            confetti({
              ...common,
              particleCount: 18,
              spread: 90,
              startVelocity: 22,
              origin: { y: 0.82 },
            }),
          140
        );
      }
    };
    fire();
  }, [signal, reduce]);

  return null;
}
