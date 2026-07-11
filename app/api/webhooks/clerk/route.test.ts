import { describe, it, expect, vi, beforeEach } from "vitest";

const { verify, deleteMany } = vi.hoisted(() => ({
  verify: vi.fn(),
  deleteMany: vi.fn(),
}));
vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(function Webhook() {
    return { verify };
  }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { deleteMany } } }));

import { POST } from "./route";

function req(body: object) {
  return new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: { "svix-id": "1", "svix-timestamp": "1", "svix-signature": "v1,x" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => { verify.mockReset(); deleteMany.mockReset(); process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_test"; });

describe("clerk webhook", () => {
  it("deletes the profile on a verified user.deleted event", async () => {
    verify.mockReturnValue({ type: "user.deleted", data: { id: "user_123" } });
    const res = await POST(req({}));
    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalledWith({ where: { clerkUserId: "user_123" } });
  });

  it("rejects an invalid signature with 400 and does not delete", async () => {
    verify.mockImplementation(() => { throw new Error("bad signature"); });
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("ignores other event types with 200 and no delete", async () => {
    verify.mockReturnValue({ type: "user.created", data: { id: "user_123" } });
    const res = await POST(req({}));
    expect(res.status).toBe(200);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
