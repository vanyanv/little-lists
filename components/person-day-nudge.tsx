"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { soonestUpcomingDay } from "@/lib/special-day";
import { focusRing } from "@/lib/a11y";

// localStorage via useSyncExternalStore, mirroring DemoBanner: the server
// snapshot says "dismissed", so SSR/hydration render nothing and the banner
// appears only once the real value is readable — no hydration mismatch.
const subscribe = () => () => {};
const serverSnapshot = () => true;

function readDismissed(key: string | null): boolean {
  if (!key) return true;
  try {
    return !!localStorage.getItem(key);
  } catch {
    return true; // storage unavailable — skip the nudge rather than nag forever
  }
}

/**
 * One quiet banner when someone's remembered day lands within the next 14 days
 * (the soonest, if several). Dismissal is per occurrence in localStorage, so it
 * comes back next year — and for the next person in line.
 */
export function PersonDayNudge() {
  const { people } = useStore();
  const upcoming = useMemo(() => soonestUpcomingDay(people, 14), [people]);
  const key = upcoming ? `ll:day-nudge-${upcoming.person.id}-${upcoming.year}` : null;

  const dismissed = useSyncExternalStore(subscribe, () => readDismissed(key), serverSnapshot);
  const [hidden, setHidden] = useState(false);

  if (!upcoming || dismissed || hidden) return null;

  const { person } = upcoming;

  const dismiss = () => {
    setHidden(true);
    try {
      if (key) localStorage.setItem(key, "1");
    } catch {
      // ignore — the nudge just returns next visit
    }
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-paper py-2.5 pl-4 pr-2 shadow-soft ring-1 ring-line">
      <Link
        href={`/app/person/${person.id}`}
        className={`min-w-0 flex-1 rounded-lg text-[0.85rem] leading-snug text-brown ${focusRing}`}
      >
        <span aria-hidden>{person.emoji}</span> {person.name}&apos;s day is coming up 🎂
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-brown-soft transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-cream-deep ${focusRing}`}
      >
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
