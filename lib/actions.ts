"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserProfile } from "@/lib/server/profile";
import { ID_TO_DB_SECTION } from "@/lib/people";
import { mapItem, mapList, mapPerson, mapProfile, templateToDb } from "@/lib/server/serialize";
import type {
  Item,
  ItemType,
  List,
  ListTemplate,
  Person,
  PersonDetailEntry,
  Profile,
  StatusId,
  ThemeColor,
  ViewMode,
} from "@/lib/types";

/* ── lists ───────────────────────────────────────────────────────────── */

export interface CreateListInput {
  title: string;
  emoji: string;
  theme: ThemeColor;
  template: ListTemplate;
  defaultView: ViewMode;
}

export async function createListAction(input: CreateListInput): Promise<List> {
  const { clerkUserId } = await requireUserProfile();
  const row = await prisma.list.create({
    data: {
      userId: clerkUserId,
      title: input.title,
      emoji: input.emoji,
      themeColor: input.theme,
      templateType: templateToDb(input.template),
      defaultViewMode: input.defaultView,
    },
    include: { items: true },
  });
  return mapList(row);
}

export async function setListViewAction(listId: string, view: ViewMode): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.list.updateMany({
    where: { id: listId, userId: clerkUserId },
    data: { defaultViewMode: view },
  });
}

/* ── items ───────────────────────────────────────────────────────────── */

export interface CreateItemInput {
  type: ItemType;
  title: string;
  subtitle?: string;
  note?: string;
  status?: StatusId;
  tags?: string[];
  emoji?: string;
  seed?: string;
}

export async function createItemAction(listId: string, input: CreateItemInput): Promise<Item> {
  const { clerkUserId } = await requireUserProfile();

  // ownership: the list must belong to the caller
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!list) throw new Error("createItemAction: list not found");

  const metadata = {
    type: input.type,
    ...(input.seed ? { seed: input.seed } : {}),
  } satisfies Prisma.InputJsonObject;

  const row = await prisma.listItem.create({
    data: {
      listId,
      userId: clerkUserId,
      title: input.title,
      subtitle: input.subtitle ?? null,
      note: input.note ?? null,
      status: input.status ?? null,
      emoji: input.emoji ?? null,
      tags: input.tags ?? [],
      metadata,
    },
  });
  return mapItem(row, input.type);
}

export interface UpdateItemPatch {
  title?: string;
  subtitle?: string;
  note?: string;
  status?: StatusId;
  tags?: string[];
  emoji?: string;
  rating?: number;
}

export async function updateItemAction(itemId: string, patch: UpdateItemPatch): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();

  const existing = await prisma.listItem.findFirst({
    where: { id: itemId, userId: clerkUserId },
  });
  if (!existing) return null;

  const data: Prisma.ListItemUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.subtitle !== undefined) data.subtitle = patch.subtitle || null;
  if (patch.note !== undefined) data.note = patch.note || null;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.tags !== undefined) data.tags = patch.tags;
  if (patch.emoji !== undefined) data.emoji = patch.emoji || null;
  if (patch.rating !== undefined) {
    const meta = (existing.metadata ?? {}) as unknown as Record<string, unknown>;
    data.metadata = { ...meta, rating: patch.rating } as Prisma.InputJsonObject;
  }

  const row = await prisma.listItem.update({ where: { id: itemId }, data });
  const fallbackType = ((existing.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function deleteItemAction(itemId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.listItem.deleteMany({ where: { id: itemId, userId: clerkUserId } });
}

/* ── people ──────────────────────────────────────────────────────────── */

export interface CreatePersonInput {
  name: string;
  emoji: string;
  theme: ThemeColor;
  note?: string;
}

export async function createPersonAction(input: CreatePersonInput): Promise<Person> {
  const { clerkUserId } = await requireUserProfile();
  const row = await prisma.person.create({
    data: {
      userId: clerkUserId,
      name: input.name,
      emoji: input.emoji,
      themeColor: input.theme,
      shortNote: input.note ?? null,
    },
    include: { details: true },
  });
  return mapPerson(row);
}

export interface CreatePersonDetailInput {
  sectionId: string;
  title: string;
  note?: string;
  tags?: string[];
}

export async function createPersonDetailAction(
  personId: string,
  input: CreatePersonDetailInput
): Promise<{ sectionId: string; entry: PersonDetailEntry }> {
  const { clerkUserId } = await requireUserProfile();

  const person = await prisma.person.findFirst({
    where: { id: personId, userId: clerkUserId },
    select: { id: true },
  });
  if (!person) throw new Error("createPersonDetailAction: person not found");

  const section = ID_TO_DB_SECTION[input.sectionId];
  if (!section) throw new Error("createPersonDetailAction: unknown section");

  const row = await prisma.personDetail.create({
    data: {
      personId,
      userId: clerkUserId,
      section,
      title: input.title,
      note: input.note ?? null,
      tags: input.tags ?? [],
    },
  });

  return {
    sectionId: input.sectionId,
    entry: { id: row.id, title: row.title, note: row.note ?? undefined, tags: row.tags },
  };
}

export async function deletePersonDetailAction(detailId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.personDetail.deleteMany({ where: { id: detailId, userId: clerkUserId } });
}

/* ── profile ─────────────────────────────────────────────────────────── */

export interface UpdateProfilePatch {
  displayName?: string;
  handle?: string;
  bio?: string;
  themeColor?: ThemeColor;
}

export async function updateProfileAction(patch: UpdateProfilePatch): Promise<Profile> {
  const { clerkUserId } = await requireUserProfile();
  const row = await prisma.profile.update({
    where: { clerkUserId },
    data: {
      ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
      ...(patch.handle !== undefined ? { handle: patch.handle } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
      ...(patch.themeColor !== undefined ? { themeColor: patch.themeColor } : {}),
    },
  });
  return mapProfile(row);
}
