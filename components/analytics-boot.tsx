"use client";

import { useEffect } from "react";
import { trackProductEvent, readLastActive, markActivity, currentSessionId } from "@/lib/analytics-client";

const RETURN_GAP_MS = 30 * 60 * 1000;

/**
 * Fires once per session when a returning user starts a fresh session more than
 * 30 minutes after their last activity. Mounted in the signed-in app layout.
 */
export function AnalyticsBoot() {
  useEffect(() => {
    const last = readLastActive();
    const now = Date.now();
    if (last !== null && now - last > RETURN_GAP_MS) {
      trackProductEvent("return_session", undefined, {
        dedupeKey: `return:${currentSessionId()}`,
      });
    }
    markActivity();
  }, []);
  return null;
}
