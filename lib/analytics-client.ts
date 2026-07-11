"use client";

import type { AnalyticsProperties, ProductEventName } from "@/lib/analytics";
import { trackProductEventAction } from "@/lib/actions";

const SESSION_KEY = "ll:analytics-session";
const LAST_ACTIVE_KEY = "ll:analytics-last-active";

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return "session-unavailable";
  }
}

/** Persisted across sessions so return_session can measure the gap. */
export function markActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // storage unavailable — return_session simply won't fire; acceptable
  }
}

export function readLastActive(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function trackProductEvent(
  name: ProductEventName,
  properties?: AnalyticsProperties,
  opts?: { path?: string; dedupeKey?: string },
): void {
  markActivity();
  void trackProductEventAction({
    name,
    properties,
    sessionId: sessionId(),
    path: opts?.path,
    dedupeKey: opts?.dedupeKey,
  });
}

export { SESSION_KEY, LAST_ACTIVE_KEY };
export { sessionId as currentSessionId };
