"use client";

import { useState, useSyncExternalStore } from "react";
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
  const { profile } = useStore();
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

  return (
    <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-paper py-2.5 pl-4 pr-2 shadow-soft ring-1 ring-line">
      <p className="text-[0.85rem] leading-snug text-brown">
        Starter ideas added — make them yours or delete them anytime 🌿
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-brown-soft transition-colors hover:bg-cream-deep ${focusRing}`}
      >
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
