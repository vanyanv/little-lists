"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEMO_BANNER_DISMISSED_KEY } from "@/lib/onboarding";
import { focusRing } from "@/lib/a11y";

// localStorage via useSyncExternalStore: the server snapshot says "dismissed",
// so SSR/hydration render nothing and the banner pops in only once the real
// value is readable — no hydration mismatch, no setState-in-effect.
const subscribe = () => () => {};
const readDismissed = () => {
  try {
    return !!localStorage.getItem(DEMO_BANNER_DISMISSED_KEY);
  } catch {
    return true; // storage unavailable — skip the banner rather than nag forever
  }
};
const serverSnapshot = () => true;

/**
 * One-line nudge after onboarding seeded example content. Dismissal lives in
 * localStorage — worst case it reappears once on another device; it's only a
 * label, so that's fine.
 */
export function DemoBanner() {
  const { profile, clearExamples } = useStore();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, serverSnapshot);
  const [hidden, setHidden] = useState(false);

  if (!profile.demoSeeded || dismissed || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DEMO_BANNER_DISMISSED_KEY, "1");
    } catch {
      // ignore — the banner just returns next visit
    }
  };

  const clearAndDismiss = () => {
    clearExamples();
    dismiss();
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-paper py-2.5 pl-4 pr-2 shadow-soft ring-1 ring-line">
      <p className="text-[0.85rem] leading-snug text-brown">
        We tucked in a few starter ideas. Make them yours, or clear them anytime 🌿
      </p>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={clearAndDismiss}
          className={`relative rounded-pill px-2.5 py-1.5 text-[0.8rem] font-semibold text-brown-soft transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-cream-deep hover:text-ink ${focusRing}`}
        >
          Clear examples
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-brown-soft transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-cream-deep ${focusRing}`}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
