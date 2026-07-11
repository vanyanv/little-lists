"use client";
import { useEffect } from "react";
import { trackProductEvent } from "@/lib/analytics-client";
export function RevisitBeacon({ event }: { event: "list_revisited" | "person_revisited" }) {
  useEffect(() => { trackProductEvent(event); }, [event]);
  return null;
}
