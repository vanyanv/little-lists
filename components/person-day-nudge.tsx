"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { soonestUpcomingDay } from "@/lib/special-day";
import { focusRing } from "@/lib/a11y";
import { trackProductEvent, currentSessionId } from "@/lib/analytics-client";

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

  useEffect(() => {
    if (!upcoming || dismissed || hidden) return;
    trackProductEvent("special_day_nudge_viewed", undefined, {
      dedupeKey: `nudge:${upcoming.person.id}:${currentSessionId()}`,
    });
  }, [upcoming, dismissed, hidden]);

  if (!upcoming || dismissed || hidden) return null;

  const { person } = upcoming;

  const dismiss = () => {
    setHidden(true);
    trackProductEvent("special_day_nudge_dismissed");
    try {
      if (key) localStorage.setItem(key, "1");
    } catch {
      // ignore — the nudge just returns next visit
    }
  };

  return (
    <div
      role="status"
      className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-paper py-2.5 pl-4 pr-2 shadow-soft ring-1 ring-line"
    >
      <Link
        href={`/app/person/${person.id}`}
        onClick={() => trackProductEvent("special_day_nudge_opened")}
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
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
