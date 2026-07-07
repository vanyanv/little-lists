// Little Lists — "their day" helpers. A special day is stored as "MM-DD"
// (no year, by design — it's a day worth remembering, not a birthdate record).
// All of this is client-safe: the People nudge computes upcoming days locally.

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** days in each month; February clamps to 29 so a Feb-29 day stays valid */
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** the longest a given 1-based month can be (28..31), for forgiving validation */
export function daysInMonth(month: number): number {
  if (month < 1 || month > 12) return 31;
  return MONTH_LENGTHS[month - 1];
}

/** parse "MM-DD" into 1-based month/day, or null when absent/malformed */
export function parseSpecialDay(value?: string | null): { month: number; day: number } | null {
  if (!value) return null;
  const m = /^(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(month)) return null;
  return { month, day };
}

/** serialize 1-based month/day into "MM-DD", clamping the day to the month */
export function formatSpecialDay(month: number, day: number): string {
  const clampedDay = Math.min(Math.max(day, 1), daysInMonth(month));
  return `${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

/** a warm, year-free label like "Mar 14" */
export function specialDayLabel(value?: string | null): string | null {
  const parsed = parseSpecialDay(value);
  if (!parsed) return null;
  return `${MONTHS[parsed.month - 1]} ${parsed.day}`;
}

/**
 * Whole days from `now` until the next occurrence of this "MM-DD", handling the
 * year wrap (Dec → Jan) so a day in early January still reads as "soon" from
 * late December. Returns 0 when it's today, null when the value is unusable.
 */
export function daysUntilSpecialDay(value: string | null | undefined, now: Date = new Date()): number | null {
  const parsed = parseSpecialDay(value);
  if (!parsed) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), parsed.month - 1, parsed.day);
  // Feb 29 in a common year lands on Mar 1 via JS date rollover — acceptable.
  if (next.getTime() < today.getTime()) {
    next = new Date(now.getFullYear() + 1, parsed.month - 1, parsed.day);
  }
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);
}

export interface UpcomingDay<T> {
  person: T;
  days: number;
  /** calendar year of the upcoming occurrence — namespaces the dismissal key */
  year: number;
}

/**
 * Of everyone with a special day, the soonest occurrence landing within
 * `withinDays` (inclusive). Null when nobody qualifies.
 */
export function soonestUpcomingDay<T extends { specialDay?: string }>(
  people: T[],
  withinDays = 14,
  now: Date = new Date()
): UpcomingDay<T> | null {
  let best: UpcomingDay<T> | null = null;
  for (const person of people) {
    const days = daysUntilSpecialDay(person.specialDay, now);
    if (days === null || days > withinDays) continue;
    if (best === null || days < best.days) {
      // the occurrence year: this year unless the day already wrapped past today
      const occurrence = new Date(now.getTime());
      occurrence.setDate(occurrence.getDate() + days);
      best = { person, days, year: occurrence.getFullYear() };
    }
  }
  return best;
}
