"use server";

import { Prisma, type PersonDetail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserProfile } from "@/lib/server/profile";
import { DB_SECTION_TO_ID, ID_TO_DB_SECTION } from "@/lib/people";
import { mapItem, mapList, mapPerson, mapProfile, templateToDb } from "@/lib/server/serialize";
import { DEMO_PERSON, STARTER_OPTIONS } from "@/lib/onboarding";
import { pickDemoName } from "@/lib/demo-names";
import {
  TEMPLATE_META,
  type Item,
  type ItemType,
  type List,
  type ListTemplate,
  type Person,
  type PersonDetailEntry,
  type Profile,
  type StatusId,
  type ThemeColor,
  type ViewMode,
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

export interface UpdateListPatch {
  title?: string;
  emoji?: string;
  theme?: ThemeColor;
  template?: ListTemplate;
  defaultView?: ViewMode;
}

export async function updateListAction(listId: string, patch: UpdateListPatch): Promise<List | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.list.update({
    where: { id: listId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.theme !== undefined ? { themeColor: patch.theme } : {}),
      ...(patch.template !== undefined ? { templateType: templateToDb(patch.template) } : {}),
      ...(patch.defaultView !== undefined ? { defaultViewMode: patch.defaultView } : {}),
    },
    include: { items: true },
  });
  return mapList(row);
}

export async function deleteListAction(listId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  // ListItem.list is onDelete: Cascade, so items go with it
  await prisma.list.deleteMany({ where: { id: listId, userId: clerkUserId } });
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
  imageUrl?: string;
  /** extra provider fields persisted into metadata JSON (year, overview, author, isbn, sourceId, …) */
  meta?: Record<string, unknown>;
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
    ...(input.meta ?? {}),
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
      imageUrl: input.imageUrl ?? null,
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

export interface UpdatePersonPatch {
  name?: string;
  emoji?: string;
  theme?: ThemeColor;
  note?: string;
}

export async function updatePersonAction(personId: string, patch: UpdatePersonPatch): Promise<Person | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.person.findFirst({
    where: { id: personId, userId: clerkUserId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.person.update({
    where: { id: personId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.theme !== undefined ? { themeColor: patch.theme } : {}),
      ...(patch.note !== undefined ? { shortNote: patch.note || null } : {}),
    },
    include: { details: true },
  });
  return mapPerson(row);
}

export async function deletePersonAction(personId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  // PersonDetail.person is onDelete: Cascade, so details go with it
  await prisma.person.deleteMany({ where: { id: personId, userId: clerkUserId } });
}

export interface UpdatePersonDetailPatch {
  title?: string;
  note?: string;
  tags?: string[];
  /** UI section id to move to (e.g. "dates"); maps to the db enum via ID_TO_DB_SECTION */
  sectionId?: string;
}

export async function updatePersonDetailAction(
  detailId: string,
  patch: UpdatePersonDetailPatch
): Promise<{ sectionId: string; entry: PersonDetailEntry } | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.personDetail.findFirst({
    where: { id: detailId, userId: clerkUserId },
    select: { id: true },
  });
  if (!existing) return null;

  let section: PersonDetail["section"] | undefined;
  if (patch.sectionId !== undefined) {
    section = ID_TO_DB_SECTION[patch.sectionId];
    if (!section) throw new Error("updatePersonDetailAction: unknown section");
  }

  const row = await prisma.personDetail.update({
    where: { id: detailId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.note !== undefined ? { note: patch.note || null } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(section ? { section } : {}),
    },
  });

  return {
    sectionId: DB_SECTION_TO_ID[row.section],
    entry: { id: row.id, title: row.title, note: row.note ?? undefined, tags: row.tags },
  };
}

/* ── profile ─────────────────────────────────────────────────────────── */

export interface UpdateProfilePatch {
  displayName?: string;
  handle?: string;
  bio?: string;
  themeColor?: ThemeColor;
  checklistDismissed?: boolean;
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
      ...(patch.checklistDismissed !== undefined ? { checklistDismissed: patch.checklistDismissed } : {}),
    },
  });
  return mapProfile(row);
}

/* ── onboarding ──────────────────────────────────────────────────────── */

export interface OnboardingSelections {
  /** STARTER_OPTIONS ids the user picked */
  starters: string[];
  /** the "Little things about someone" card */
  includePerson: boolean;
  /** the "add a few example ideas" toggle */
  seedExamples: boolean;
}

export async function completeOnboardingAction(sel: OnboardingSelections): Promise<void> {
  const { clerkUserId } = await requireUserProfile();

  const chosen = STARTER_OPTIONS.filter((opt) => sel.starters.includes(opt.id));
  // The demo person comes along either way: picking the person card asks for them, and the
  // examples toggle includes them so the people feature isn't an empty mystery.
  const seedPerson = sel.includePerson || sel.seedExamples;
  const demoSeeded = sel.seedExamples || sel.includePerson;

  await prisma.$transaction(async (tx) => {
    // Claim the flag first: a double-submit (or back-button replay) loses this
    // updateMany and returns without seeding anything twice.
    const claimed = await tx.profile.updateMany({
      where: { clerkUserId, onboardingCompleted: false },
      data: { onboardingCompleted: true, demoSeeded },
    });
    if (claimed.count === 0) return;

    for (const opt of chosen) {
      const meta = TEMPLATE_META[opt.template];
      await tx.list.create({
        data: {
          userId: clerkUserId,
          title: opt.title,
          emoji: opt.emoji,
          themeColor: meta.theme,
          templateType: templateToDb(opt.template),
          defaultViewMode: meta.defaultView,
          ...(sel.seedExamples
            ? {
                items: {
                  create: opt.demoItems.map((item) => ({
                    userId: clerkUserId,
                    title: item.title,
                    status: item.status,
                    emoji: item.emoji ?? null,
                    metadata: { type: meta.kind } satisfies Prisma.InputJsonObject,
                  })),
                },
              }
            : {}),
        },
      });
    }

    if (seedPerson) {
      await tx.person.create({
        data: {
          userId: clerkUserId,
          name: pickDemoName(),
          emoji: DEMO_PERSON.emoji,
          themeColor: DEMO_PERSON.theme,
          shortNote: DEMO_PERSON.note,
          details: {
            create: DEMO_PERSON.details.map((d) => ({
              userId: clerkUserId,
              section: ID_TO_DB_SECTION[d.sectionId],
              title: d.title,
            })),
          },
        },
      });
    }
  });
}

export async function skipOnboardingAction(): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.profile.update({
    where: { clerkUserId },
    data: { onboardingCompleted: true },
  });
}
