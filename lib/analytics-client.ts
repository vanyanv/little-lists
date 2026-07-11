"use client";

import type { AnalyticsProperties, ProductEventName } from "@/lib/analytics";
import { trackProductEventAction } from "@/lib/actions";

const SESSION_KEY = "ll:analytics-session";

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

export function trackProductEvent(
  name: ProductEventName,
  properties?: AnalyticsProperties,
  path?: string,
): void {
  void trackProductEventAction({
    name,
    properties,
    sessionId: sessionId(),
    path,
  });
}
