"use server";

import { Prisma, type PersonDetail } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserProfile, getCurrentUserProfile } from "@/lib/server/profile";
import {
  recordProductEvent,
  isProductEventName,
  sanitizeAnalyticsProperties,
  type AnalyticsProperties,
} from "@/lib/analytics";
import { DB_SECTION_TO_ID, ID_TO_DB_SECTION } from "@/lib/people";
import { mapItem, mapList, mapPerson, mapProfile, mapScrap, templateToDb } from "@/lib/server/serialize";
import { DEMO_PERSON, EXAMPLE_TAG, STARTER_OPTIONS } from "@/lib/onboarding";
import { pickDemoName } from "@/lib/demo-names";
import { SCRAP_MAX_LENGTH, type DetectionResult } from "@/lib/scraps";
import {
  TEMPLATE_META,
  type Item,
  type ItemType,
  type List,
  type ListTemplate,
  type Person,
  type PersonDetailEntry,
  type Profile,
  type Scrap,
  type StatusId,
  type ThemeColor,
  type ViewMode,
} from "@/lib/types";
import type { SortMode } from "@/lib/sort";

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
  void recordProductEvent({
    userId: clerkUserId,
    name: "list_created",
    properties: { template: input.template },
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

export async function setListPinnedAction(listId: string, pinned: boolean): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  // updateMany scopes the write to the caller's own row — a direct POST for
  // someone else's list matches nothing and changes nothing.
  await prisma.list.updateMany({
    where: { id: listId, userId: clerkUserId },
    data: { pinned },
  });
}

export async function deleteListAction(listId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  // ListItem.list is onDelete: Cascade, so items go with it
  await prisma.list.deleteMany({ where: { id: listId, userId: clerkUserId } });
  void recordProductEvent({
    userId: clerkUserId,
    name: "entity_deleted",
    properties: { entity: "list" },
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
  imageUrl?: string;
  /** extra provider fields persisted into metadata JSON (year, overview, author, isbn, sourceId, …) */
  meta?: Record<string, unknown>;
  /** links this item to a person (e.g. a gift idea for someone) */
  personId?: string;
  /** which add flow produced this — analytics only, never persisted to the row */
  flow?: "quick" | "detailed" | "import";
}

function itemCreateData(clerkUserId: string, listId: string, input: CreateItemInput) {
  const metadata = {
    ...(input.meta ?? {}),
    type: input.type,
    ...(input.seed ? { seed: input.seed } : {}),
  } satisfies Prisma.InputJsonObject;
  return {
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
    personId: input.personId ?? null,
  };
}

export async function createItemAction(listId: string, input: CreateItemInput): Promise<Item> {
  const { clerkUserId } = await requireUserProfile();

  // ownership: the list must belong to the caller
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!list) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "operation_error",
      properties: { action: "createItemAction", code: "list_not_found" },
    });
    throw new Error("createItemAction: list not found");
  }

  if (input.personId) {
    const person = await prisma.person.findFirst({
      where: { id: input.personId, userId: clerkUserId },
      select: { id: true },
    });
    if (!person) {
      void recordProductEvent({
        userId: clerkUserId,
        name: "operation_error",
        properties: { action: "createItemAction", code: "person_not_found" },
      });
      throw new Error("createItemAction: person not found");
    }
  }

  const row = await prisma.listItem.create({ data: itemCreateData(clerkUserId, listId, input) });
  const itemCount = await prisma.listItem.count({
    where: { userId: clerkUserId, NOT: { tags: { has: EXAMPLE_TAG } } },
  });
  void recordProductEvent({
    userId: clerkUserId,
    name: "item_created",
    properties: {
      hasPerson: Boolean(input.personId),
      hasNote: Boolean(input.note),
      hasRating: typeof input.meta?.rating === "number",
      flow: input.flow ?? "detailed",
    },
  });
  if (itemCount === 1) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "onboarding_completed",
      dedupeKey: `onboarding:${clerkUserId}`,
    });
  }
  return mapItem(row, input.type);
}

/** Transactional bulk create for paste-to-import. Rows get descending-offset
 *  createdAt so paste order reads top-down in the default recently-added sort
 *  (line 1 newest). Caps at 50 inputs; analytics: one summary event + one
 *  item_created per row with flow "import". */
export async function importItemsAction(listId: string, inputs: CreateItemInput[]): Promise<Item[]> {
  const { clerkUserId } = await requireUserProfile();
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!list) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "operation_error",
      properties: { action: "importItemsAction", code: "list_not_found" },
    });
    throw new Error("importItemsAction: list not found");
  }
  const batch = inputs.slice(0, 50);
  const base = Date.now();
  const rows = await prisma.$transaction(
    batch.map((input, i) =>
      prisma.listItem.create({
        data: {
          ...itemCreateData(clerkUserId, listId, input),
          createdAt: new Date(base + (batch.length - i)),
        },
      })
    )
  );
  const matched = batch.filter((i) => i.imageUrl).length;
  void recordProductEvent({
    userId: clerkUserId,
    name: "feature_used",
    properties: { feature: "paste_import", lines: batch.length, matched },
  });
  for (const input of batch) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "item_created",
      properties: {
        hasPerson: false,
        hasNote: Boolean(input.note),
        hasRating: false,
        flow: "import",
      },
    });
  }
  return rows.map((row, i) => mapItem(row, batch[i].type));
}

export interface UpdateItemPatch {
  title?: string;
  subtitle?: string;
  note?: string;
  status?: StatusId;
  tags?: string[];
  emoji?: string;
  rating?: number;
  /** links to a person, or null to clear the link */
  personId?: string | null;
}

export async function updateItemAction(itemId: string, patch: UpdateItemPatch): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();

  const existing = await prisma.listItem.findFirst({
    where: { id: itemId, userId: clerkUserId },
  });
  if (!existing) return null;

  if (patch.personId) {
    const person = await prisma.person.findFirst({
      where: { id: patch.personId, userId: clerkUserId },
      select: { id: true },
    });
    if (!person) {
      void recordProductEvent({
        userId: clerkUserId,
        name: "operation_error",
        properties: { action: "updateItemAction", code: "person_not_found" },
      });
      throw new Error("updateItemAction: person not found");
    }
  }

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
  if (patch.personId !== undefined) {
    data.person = patch.personId ? { connect: { id: patch.personId } } : { disconnect: true };
  }

  const row = await prisma.listItem.update({ where: { id: itemId }, data });
  const fallbackType = ((existing.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function deleteItemAction(itemId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.listItem.deleteMany({ where: { id: itemId, userId: clerkUserId } });
  void recordProductEvent({
    userId: clerkUserId,
    name: "entity_deleted",
    properties: { entity: "item" },
  });
}

/* ── organization: sort, pin, reorder, move, copy ────────────────────── */

export async function setListSortAction(listId: string, sort: SortMode): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.list.updateMany({
    where: { id: listId, userId: clerkUserId },
    data: { defaultSort: sort },
  });
}

export async function setItemPinnedAction(itemId: string, pinned: boolean): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.listItem.findFirst({ where: { id: itemId, userId: clerkUserId } });
  if (!existing) return null;
  const row = await prisma.listItem.update({ where: { id: itemId }, data: { pinned } });
  const fallbackType = ((existing.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function reorderItemsAction(listId: string, orderedIds: string[]): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!list) return;
  // orderedIds must be exactly this list's items — a foreign or missing id
  // aborts the whole reorder rather than corrupting positions.
  const owned = await prisma.listItem.findMany({
    where: { listId, userId: clerkUserId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((i) => i.id));
  if (
    orderedIds.length !== ownedIds.size ||
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.some((id) => !ownedIds.has(id))
  ) {
    return;
  }
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.listItem.update({ where: { id }, data: { position: index } })
    )
  );
}

export async function moveItemAction(itemId: string, targetListId: string): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();
  const item = await prisma.listItem.findFirst({ where: { id: itemId, userId: clerkUserId } });
  if (!item) return null;
  const target = await prisma.list.findFirst({
    where: { id: targetListId, userId: clerkUserId },
    select: { id: true },
  });
  if (!target) return null;
  const max = await prisma.listItem.aggregate({
    where: { listId: targetListId },
    _max: { position: true },
  });
  const nextPos = max._max.position == null ? null : max._max.position + 1;
  const row = await prisma.listItem.update({
    where: { id: itemId },
    data: { listId: targetListId, position: nextPos },
  });
  const fallbackType = ((item.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function copyItemAction(itemId: string, targetListId: string): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();
  const item = await prisma.listItem.findFirst({ where: { id: itemId, userId: clerkUserId } });
  if (!item) return null;
  const target = await prisma.list.findFirst({
    where: { id: targetListId, userId: clerkUserId },
    select: { id: true },
  });
  if (!target) return null;
  const max = await prisma.listItem.aggregate({
    where: { listId: targetListId },
    _max: { position: true },
  });
  const nextPos = max._max.position == null ? null : max._max.position + 1;
  const row = await prisma.listItem.create({
    data: {
      listId: targetListId,
      userId: clerkUserId,
      title: item.title,
      subtitle: item.subtitle,
      note: item.note,
      status: item.status,
      emoji: item.emoji,
      imageUrl: item.imageUrl,
      tags: item.tags,
      metadata: item.metadata as Prisma.InputJsonValue,
      personId: item.personId,
      position: nextPos,
      pinned: false,
    },
  });
  const fallbackType = ((item.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function duplicateListAction(listId: string): Promise<List | null> {
  const { clerkUserId } = await requireUserProfile();
  const source = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  if (!source) return null;
  const row = await prisma.list.create({
    data: {
      userId: clerkUserId,
      title: `${source.title} (copy)`,
      emoji: source.emoji,
      templateType: source.templateType,
      themeColor: source.themeColor,
      defaultViewMode: source.defaultViewMode,
      defaultSort: source.defaultSort,
      description: source.description,
      pinned: false,
      items: {
        create: source.items.map((it) => ({
          userId: clerkUserId,
          title: it.title,
          subtitle: it.subtitle,
          note: it.note,
          status: it.status,
          emoji: it.emoji,
          imageUrl: it.imageUrl,
          tags: it.tags,
          metadata: it.metadata as Prisma.InputJsonValue,
          position: it.position,
          pinned: it.pinned,
          personId: it.personId,
        })),
      },
    },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  return mapList(row);
}

/* ── scraps ──────────────────────────────────────────────────────────── */

export async function createScrapAction(text: string): Promise<Scrap> {
  const { clerkUserId } = await requireUserProfile();
  const trimmed = text.trim().slice(0, SCRAP_MAX_LENGTH);
  if (!trimmed) throw new Error("createScrapAction: empty text");
  const row = await prisma.scrap.create({ data: { userId: clerkUserId, text: trimmed } });
  void recordProductEvent({ userId: clerkUserId, name: "pocket_captured" });
  return mapScrap(row);
}

export async function deleteScrapAction(scrapId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.scrap.deleteMany({ where: { id: scrapId, userId: clerkUserId } });
  void recordProductEvent({
    userId: clerkUserId,
    name: "entity_deleted",
    properties: { entity: "scrap" },
  });
}

/** persist the enrichment guess (or a definitive "none") so detection runs once per scrap */
export async function saveScrapDetectionAction(scrapId: string, detection: DetectionResult): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.scrap.updateMany({
    where: { id: scrapId, userId: clerkUserId },
    data: { detection: detection as unknown as Prisma.InputJsonObject },
  });
}

/** file a scrap: create the list item and retire the scrap in one transaction */
export async function fileScrapAction(scrapId: string, listId: string, input: CreateItemInput): Promise<Item> {
  const { clerkUserId } = await requireUserProfile();
  const item = await prisma.$transaction(async (tx) => {
    const scrap = await tx.scrap.findFirst({
      where: { id: scrapId, userId: clerkUserId },
      select: { id: true },
    });
    if (!scrap) {
      void recordProductEvent({
        userId: clerkUserId,
        name: "operation_error",
        properties: { action: "fileScrapAction", code: "scrap_not_found" },
      });
      throw new Error("fileScrapAction: scrap not found");
    }
    const list = await tx.list.findFirst({
      where: { id: listId, userId: clerkUserId },
      select: { id: true },
    });
    if (!list) {
      void recordProductEvent({
        userId: clerkUserId,
        name: "operation_error",
        properties: { action: "fileScrapAction", code: "list_not_found" },
      });
      throw new Error("fileScrapAction: list not found");
    }

    if (input.personId) {
      const person = await tx.person.findFirst({
        where: { id: input.personId, userId: clerkUserId },
        select: { id: true },
      });
      if (!person) {
        void recordProductEvent({
          userId: clerkUserId,
          name: "operation_error",
          properties: { action: "fileScrapAction", code: "person_not_found" },
        });
        throw new Error("fileScrapAction: person not found");
      }
    }

    const row = await tx.listItem.create({ data: itemCreateData(clerkUserId, listId, input) });
    await tx.scrap.delete({ where: { id: scrapId } });
    return mapItem(row, input.type);
  });
  void recordProductEvent({
    userId: clerkUserId,
    name: "pocket_filed",
    properties: { hasPerson: Boolean(input.personId) },
  });
  return item;
}

/* ── people ──────────────────────────────────────────────────────────── */

export interface CreatePersonInput {
  name: string;
  emoji: string;
  theme: ThemeColor;
  note?: string;
  /** an optional "MM-DD" day worth remembering */
  specialDay?: string;
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
      specialDay: input.specialDay ?? null,
    },
    include: { details: true },
  });
  void recordProductEvent({ userId: clerkUserId, name: "person_created" });
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

  void recordProductEvent({
    userId: clerkUserId,
    name: "person_detail_created",
    properties: { kind: section },
  });

  return {
    sectionId: input.sectionId,
    entry: { id: row.id, title: row.title, note: row.note ?? undefined, tags: row.tags },
  };
}

export async function deletePersonDetailAction(detailId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.personDetail.deleteMany({ where: { id: detailId, userId: clerkUserId } });
  void recordProductEvent({
    userId: clerkUserId,
    name: "entity_deleted",
    properties: { entity: "detail" },
  });
}

export interface UpdatePersonPatch {
  name?: string;
  emoji?: string;
  theme?: ThemeColor;
  note?: string;
  /** "MM-DD", or "" to clear the day */
  specialDay?: string;
}

export async function updatePersonAction(personId: string, patch: UpdatePersonPatch): Promise<Person | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.person.findFirst({
    where: { id: personId, userId: clerkUserId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.person.update({
      where: { id: personId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
        ...(patch.theme !== undefined ? { themeColor: patch.theme } : {}),
        ...(patch.note !== undefined ? { shortNote: patch.note || null } : {}),
        ...(patch.specialDay !== undefined ? { specialDay: patch.specialDay || null } : {}),
      },
      include: { details: true },
    });
    // keep the denormalized subtitle on linked items in sync with the new name,
    // so a gift card never shows a stale "who's it for" after reload.
    if (patch.name !== undefined) {
      await tx.listItem.updateMany({
        where: { personId, userId: clerkUserId },
        data: { subtitle: patch.name },
      });
    }
    return updated;
  });
  return mapPerson(row);
}

export async function deletePersonAction(personId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  // PersonDetail.person is onDelete: Cascade, so details go with it
  await prisma.person.deleteMany({ where: { id: personId, userId: clerkUserId } });
  void recordProductEvent({
    userId: clerkUserId,
    name: "entity_deleted",
    properties: { entity: "person" },
  });
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
  themeColor?: ThemeColor;
  checklistDismissed?: boolean;
}

export async function updateProfileAction(patch: UpdateProfilePatch): Promise<Profile> {
  const { clerkUserId } = await requireUserProfile();
  const row = await prisma.profile.update({
    where: { clerkUserId },
    data: {
      ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
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
  // The demo person only shows up when the person card is actually picked — no
  // surprise stranger just because someone wanted a few example list items.
  const seedPerson = sel.includePerson;
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
                    // labeled so the UI can mark them and "Clear examples" can find them
                    tags: [EXAMPLE_TAG],
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
              // seeded, so the first-steps checklist still nudges a real detail
              tags: [EXAMPLE_TAG],
            })),
          },
        },
      });
    }
  });
}

/**
 * Remove the seeded example list items for the current user. Scoped to their
 * own rows and to the example tag, so real content is never touched.
 */
export async function clearExamplesAction(): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.listItem.deleteMany({
    where: { userId: clerkUserId, tags: { has: EXAMPLE_TAG } },
  });
}

export async function skipOnboardingAction(): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.profile.update({
    where: { clerkUserId },
    data: { onboardingCompleted: true },
  });
}

/* ── analytics ───────────────────────────────────────────────────────── */

/**
 * Client-emitted product events land here. Must never throw into a render:
 * unknown names and unauthenticated callers are dropped silently, and any
 * failure is swallowed.
 */
export async function trackProductEventAction(input: {
  name: string;
  properties?: AnalyticsProperties;
  sessionId?: string;
  path?: string;
  dedupeKey?: string;
}): Promise<void> {
  try {
    if (!isProductEventName(input.name)) return;
    const profile = await getCurrentUserProfile();
    if (!profile) return;
    await recordProductEvent({
      userId: profile.clerkUserId,
      name: input.name,
      properties: sanitizeAnalyticsProperties(input.properties),
      sessionId: input.sessionId,
      path: input.path,
      dedupeKey: input.dedupeKey,
    });
  } catch (error) {
    console.error("trackProductEventAction failed", error);
  }
}

/* ── account ─────────────────────────────────────────────────────────── */

/**
 * Delete the signed-in user's account and all their data. Removes the DB row
 * immediately (belt-and-suspenders: the Clerk user.deleted webhook also wipes
 * it), then deletes the Clerk user, which ends their session.
 */
export async function deleteAccountAction(): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.profile.deleteMany({ where: { clerkUserId } });
  const client = await clerkClient();
  await client.users.deleteUser(clerkUserId);
  // Belt-and-suspenders: a concurrent request could have raced with the Clerk
  // deletion and re-created the Profile row via ensureProfileForClerkUser in
  // that window. Clear it again now that the Clerk user is gone for good.
  await prisma.profile.deleteMany({ where: { clerkUserId } });
}
