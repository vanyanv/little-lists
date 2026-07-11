import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PRODUCT_EVENT_NAMES = [
  "sign_up_completed",
  "onboarding_completed",
  "list_created",
  "item_created",
  "person_created",
  "person_detail_created",
  "pocket_captured",
  "pocket_filed",
  "search_completed",
  "return_session",
  "list_revisited",
  "person_revisited",
  "special_day_nudge_viewed",
  "special_day_nudge_opened",
  "special_day_nudge_dismissed",
  "feature_used",
  "entity_deleted",
  "operation_error",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];
export type AnalyticsProperties = Record<string, string | number | boolean | null>;

const EVENT_NAMES = new Set<string>(PRODUCT_EVENT_NAMES);

export function isProductEventName(value: string): value is ProductEventName {
  return EVENT_NAMES.has(value);
}

const MAX_KEYS = 12;
const MAX_STRING = 120;

/**
 * Defense-in-depth: strip anything that isn't a categorical primitive so no
 * user-authored content can ever reach the analytics table. Deterministic
 * (sorted keys) so truncation is stable in tests.
 */
export function sanitizeAnalyticsProperties(input: unknown): AnalyticsProperties {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const out: AnalyticsProperties = {};
  const keys = Object.keys(input as Record<string, unknown>).sort();
  for (const key of keys) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string") out[key] = value.slice(0, MAX_STRING);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) out[key] = value;
    // everything else (objects, arrays, functions, undefined) is dropped
  }
  return out;
}

/**
 * Product analytics must never make the product action fail. Callers pass only
 * categorical values, booleans, and counts, never user-authored content.
 */
export async function recordProductEvent(input: {
  userId: string;
  name: ProductEventName;
  properties?: AnalyticsProperties;
  sessionId?: string;
  path?: string;
  dedupeKey?: string;
}): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: input.userId,
        name: input.name,
        properties: (input.properties ?? {}) as Prisma.InputJsonObject,
        sessionId: input.sessionId?.slice(0, 80),
        path: input.path?.slice(0, 160),
        dedupeKey: input.dedupeKey,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    console.error("Product analytics event failed", input.name, error);
  }
}
