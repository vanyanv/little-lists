import { describe, it, expect, vi, beforeEach } from "vitest";

const { recordProductEvent, getCurrentUserProfile } = vi.hoisted(() => ({
  recordProductEvent: vi.fn(),
  getCurrentUserProfile: vi.fn(),
}));

vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return { ...actual, recordProductEvent };
});
vi.mock("@/lib/server/profile", () => ({
  getCurrentUserProfile,
  requireUserProfile: vi.fn(),
  ensureProfileForClerkUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { trackProductEventAction } from "./actions";

beforeEach(() => {
  recordProductEvent.mockReset();
  getCurrentUserProfile.mockReset();
});

describe("trackProductEventAction", () => {
  it("drops unknown event names", async () => {
    getCurrentUserProfile.mockResolvedValue({ clerkUserId: "u1" });
    await trackProductEventAction({ name: "bogus_event" });
    expect(recordProductEvent).not.toHaveBeenCalled();
  });

  it("drops when there is no signed-in profile", async () => {
    getCurrentUserProfile.mockResolvedValue(null);
    await trackProductEventAction({ name: "list_created" });
    expect(recordProductEvent).not.toHaveBeenCalled();
  });

  it("records a valid event with sanitized properties and forwards dedupeKey", async () => {
    getCurrentUserProfile.mockResolvedValue({ clerkUserId: "u1" });
    await trackProductEventAction({
      name: "search_completed",
      properties: { kind: "movies", resultCount: 3, junk: { nested: 1 } } as never,
      sessionId: "s1",
      path: "/app",
      dedupeKey: "return:s1",
    });
    expect(recordProductEvent).toHaveBeenCalledTimes(1);
    const arg = recordProductEvent.mock.calls[0][0];
    expect(arg.userId).toBe("u1");
    expect(arg.name).toBe("search_completed");
    expect(arg.properties).toEqual({ kind: "movies", resultCount: 3 });
    expect(arg.dedupeKey).toBe("return:s1");
  });

  it("never throws even if recordProductEvent rejects", async () => {
    getCurrentUserProfile.mockResolvedValue({ clerkUserId: "u1" });
    recordProductEvent.mockRejectedValue(new Error("db down"));
    await expect(trackProductEventAction({ name: "list_created" })).resolves.toBeUndefined();
  });
});
