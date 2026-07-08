import "server-only";
import type {
  List as DbList,
  ListItem as DbItem,
  Person as DbPerson,
  PersonDetail as DbPersonDetail,
  Profile as DbProfile,
  Scrap as DbScrap,
  TemplateType,
} from "@prisma/client";
import {
  TEMPLATE_META,
  type Item,
  type ItemType,
  type List,
  type ListTemplate,
  type Person,
  type PersonSection,
  type Profile,
  type Scrap,
  type StatusId,
  type ThemeColor,
  type ViewMode,
} from "@/lib/types";
import { DB_SECTION_TO_ID, PERSON_SECTIONS } from "@/lib/people";

/* ── enum bridges (the only real gap is people_notes ↔ people) ───────── */

export function templateToUi(db: TemplateType): ListTemplate {
  return db === "people_notes" ? "people" : (db as ListTemplate);
}

export function templateToDb(ui: ListTemplate): TemplateType {
  return ui === "people" ? "people_notes" : (ui as TemplateType);
}

/* ── items ───────────────────────────────────────────────────────────── */

interface ItemMeta {
  type?: ItemType;
  seed?: string;
  rating?: number;
}

export function mapItem(row: DbItem, fallbackType: ItemType): Item {
  const meta = (row.metadata ?? {}) as unknown as ItemMeta;
  return {
    id: row.id,
    type: meta.type ?? fallbackType,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    note: row.note ?? undefined,
    status: (row.status as StatusId | null) ?? undefined,
    rating: meta.rating,
    tags: row.tags.length ? row.tags : undefined,
    emoji: row.emoji ?? undefined,
    seed: meta.seed ?? undefined,
  };
}

/* ── lists ───────────────────────────────────────────────────────────── */

export function mapList(row: DbList & { items?: DbItem[] }): List {
  const template = templateToUi(row.templateType);
  const meta = TEMPLATE_META[template];
  const items = (row.items ?? []).map((i) => mapItem(i, meta.kind));
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    theme: row.themeColor as ThemeColor,
    noun: meta.noun,
    kind: meta.kind,
    template,
    defaultView: row.defaultViewMode as ViewMode,
    pinned: row.pinned,
    items,
  };
}

/* ── people ──────────────────────────────────────────────────────────── */

export function mapPerson(row: DbPerson & { details?: DbPersonDetail[] }): Person {
  const details = row.details ?? [];
  const sections: PersonSection[] = PERSON_SECTIONS.map((def) => ({
    id: def.id,
    label: def.label,
    emoji: def.emoji,
    kind: def.kind,
    entries: details
      .filter((d) => DB_SECTION_TO_ID[d.section] === def.id)
      .map((d) => ({
        id: d.id,
        title: d.title,
        note: d.note ?? undefined,
        tags: d.tags,
      })),
  }));
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    theme: (row.themeColor as ThemeColor) ?? "blush",
    note: row.shortNote ?? "",
    specialDay: row.specialDay ?? undefined,
    sections,
  };
}

/* ── profile ─────────────────────────────────────────────────────────── */

export function mapProfile(row: DbProfile): Profile {
  return {
    name: row.displayName?.trim() || "friend",
    handle: row.handle?.trim() || "",
    avatarEmoji: "🌙",
    bio: row.bio?.trim() || "",
    theme: (row.themeColor as ThemeColor) ?? "blush",
    tags: [],
    featuredListIds: [],
    isPublic: false,
    demoSeeded: row.demoSeeded,
    checklistDismissed: row.checklistDismissed,
  };
}

/* ── scraps ──────────────────────────────────────────────────────────── */

export function mapScrap(row: DbScrap): Scrap {
  return {
    id: row.id,
    text: row.text,
    detection: (row.detection as unknown as Scrap["detection"]) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
