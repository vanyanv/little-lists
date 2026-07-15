"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { PEOPLE_TEMPLATE_NUDGE_DISMISSED_KEY } from "@/lib/onboarding";
import { focusRing } from "@/lib/a11y";
import { Button } from "./button";

// localStorage via useSyncExternalStore, mirroring DemoBanner: the server
// snapshot says "dismissed", so SSR/hydration render nothing and the card
// appears only once the real value is readable — no hydration mismatch.
const subscribe = () => () => {};
const readDismissed = () => {
  try {
    return !!localStorage.getItem(PEOPLE_TEMPLATE_NUDGE_DISMISSED_KEY);
  } catch {
    return true; // storage unavailable — skip the nudge rather than nag forever
  }
};
const serverSnapshot = () => true;

/**
 * One-time nudge shown on grandfathered "People notes" lists. The template
 * is retired from every picker (the People tab is the canonical place for
 * this now), but existing lists keep working untouched — this just points
 * toward the better home for future notes about someone. Dismissal is a
 * single localStorage flag, so it's gone for good once cleared.
 */
export function PeopleTemplateNudge() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, serverSnapshot);
  const [hidden, setHidden] = useState(false);

  if (dismissed || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(PEOPLE_TEMPLATE_NUDGE_DISMISSED_KEY, "1");
    } catch {
      // ignore — the nudge just returns next visit
    }
  };

  return (
    <div className="relative mt-4 flex items-start gap-3 rounded-2xl bg-paper py-3 pl-4 pr-11 shadow-soft ring-1 ring-line">
      <div className="min-w-0 flex-1">
        <p className="text-[0.85rem] leading-snug text-brown">
          Keeping notes about someone? Give them their own little page. Everything about them stays together 🌼
        </p>
        <Button href="/app/people" variant="soft" size="sm" className="mt-2.5">
          Visit People
        </Button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className={`absolute right-2 top-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-brown-soft transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-cream-deep ${focusRing}`}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
