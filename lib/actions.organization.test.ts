import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireUserProfile } = vi.hoisted(() => ({
  requireUserProfile: vi.fn(),
}));

// prisma surface used by the organization actions
const { prisma } = vi.hoisted(() => ({
  prisma: {
    list: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    listItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/server/profile", () => ({
  requireUserProfile,
  getCurrentUserProfile: vi.fn(),
  ensureProfileForClerkUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
// analytics is not exercised here; stub the recorder so imports resolve
vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return { ...actual, recordProductEvent: vi.fn() };
});
// clerk client is imported at module top for deleteAccountAction
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

import {
  setListSortAction,
  setItemPinnedAction,
  reorderItemsAction,
  moveItemAction,
  copyItemAction,
  duplicateListAction,
} from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireUserProfile.mockResolvedValue({ clerkUserId: "u1" });
  // default $transaction: run the array of promises (or the callback)
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[])
  );
});

describe("setListSortAction", () => {
  it("scopes the write to the caller's own list", async () => {
    prisma.list.updateMany.mockResolvedValue({ count: 1 });
    await setListSortAction("l1", "title");
    expect(prisma.list.updateMany).toHaveBeenCalledWith({
      where: { id: "l1", userId: "u1" },
      data: { defaultSort: "title" },
    });
  });
});

describe("setItemPinnedAction", () => {
  it("returns null when the item is not the caller's", async () => {
    prisma.listItem.findFirst.mockResolvedValue(null);
    expect(await setItemPinnedAction("i1", true)).toBeNull();
    expect(prisma.listItem.update).not.toHaveBeenCalled();
  });
  it("writes pinned and returns the mapped item", async () => {
    prisma.listItem.findFirst.mockResolvedValue({ id: "i1", metadata: { type: "movie" } });
    prisma.listItem.update.mockResolvedValue({
      id: "i1", title: "X", tags: [], metadata: { type: "movie" }, pinned: true, position: null,
    });
    const res = await setItemPinnedAction("i1", true);
    expect(prisma.listItem.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { pinned: true } });
    expect(res?.pinned).toBe(true);
  });
});

describe("reorderItemsAction", () => {
  it("does nothing when the list is not the caller's", async () => {
    prisma.list.findFirst.mockResolvedValue(null);
    await reorderItemsAction("l1", ["a", "b"]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("rejects when orderedIds do not exactly match the list's items", async () => {
    prisma.list.findFirst.mockResolvedValue({ id: "l1" });
    prisma.listItem.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    await reorderItemsAction("l1", ["a", "STRAY"]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("writes position=index for each id in order", async () => {
    prisma.list.findFirst.mockResolvedValue({ id: "l1" });
    prisma.listItem.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    prisma.listItem.update.mockImplementation((args: unknown) => args);
    await reorderItemsAction("l1", ["b", "a"]);
    expect(prisma.listItem.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { position: 0 } });
    expect(prisma.listItem.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { position: 1 } });
  });
});

describe("moveItemAction", () => {
  it("requires both the item and the target list to be the caller's", async () => {
    prisma.listItem.findFirst.mockResolvedValue({ id: "i1", metadata: {} });
    prisma.list.findFirst.mockResolvedValue(null); // target not owned
    expect(await moveItemAction("i1", "l2")).toBeNull();
    expect(prisma.listItem.update).not.toHaveBeenCalled();
  });
  it("reassigns listId and appends at the target end", async () => {
    prisma.listItem.findFirst.mockResolvedValue({ id: "i1", metadata: { type: "book" } });
    prisma.list.findFirst.mockResolvedValue({ id: "l2" });
    prisma.listItem.aggregate.mockResolvedValue({ _max: { position: 4 } });
    prisma.listItem.update.mockResolvedValue({ id: "i1", title: "X", tags: [], metadata: { type: "book" }, pinned: false, position: 5 });
    await moveItemAction("i1", "l2");
    expect(prisma.listItem.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { listId: "l2", position: 5 },
    });
  });
});

describe("copyItemAction", () => {
  it("creates a new row in the target with pinned reset to false", async () => {
    prisma.listItem.findFirst.mockResolvedValue({
      id: "i1", title: "X", subtitle: null, note: null, status: "watched",
      emoji: null, imageUrl: null, tags: ["t"], metadata: { type: "movie" },
      personId: null, pinned: true,
    });
    prisma.list.findFirst.mockResolvedValue({ id: "l2" });
    prisma.listItem.aggregate.mockResolvedValue({ _max: { position: null } });
    prisma.listItem.create.mockResolvedValue({ id: "i2", title: "X", tags: ["t"], metadata: { type: "movie" }, pinned: false, position: null });
    await copyItemAction("i1", "l2");
    const arg = prisma.listItem.create.mock.calls[0][0].data;
    expect(arg.listId).toBe("l2");
    expect(arg.pinned).toBe(false);
    expect(arg.title).toBe("X");
    expect(arg.tags).toEqual(["t"]);
  });
});

describe("duplicateListAction", () => {
  it("returns null when the source is not the caller's", async () => {
    prisma.list.findFirst.mockResolvedValue(null);
    expect(await duplicateListAction("l1")).toBeNull();
  });
  it("copies the list with a (copy) title and deep-copies items", async () => {
    prisma.list.findFirst.mockResolvedValue({
      id: "l1", title: "Films", emoji: "🎬", templateType: "movie", themeColor: "blush",
      defaultViewMode: "grid", defaultSort: "title", description: null, pinned: true,
      items: [{ title: "A", subtitle: null, note: null, status: null, emoji: null, imageUrl: null, tags: [], metadata: { type: "movie" }, position: 0, pinned: false, personId: null }],
    });
    prisma.list.create.mockResolvedValue({
      id: "l2", title: "Films (copy)", emoji: "🎬", templateType: "movie", themeColor: "blush",
      defaultViewMode: "grid", defaultSort: "title", pinned: false, items: [],
    });
    const res = await duplicateListAction("l1");
    const arg = prisma.list.create.mock.calls[0][0].data;
    expect(arg.title).toBe("Films (copy)");
    expect(arg.pinned).toBe(false);
    expect(arg.items.create).toHaveLength(1);
    expect(res?.title).toBe("Films (copy)");
  });
});
