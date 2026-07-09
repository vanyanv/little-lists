import {
  TEMPLATE_META,
  type Item,
  type ItemType,
  type List,
  type ListTemplate,
  type Person,
  type PersonDetailEntry,
} from "./types";

export function mutateSection(
  people: Person[],
  personId: string,
  sectionId: string,
  fn: (entries: PersonDetailEntry[]) => PersonDetailEntry[]
): Person[] {
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          sections: p.sections.map((s) =>
            s.id === sectionId ? { ...s, entries: fn(s.entries) } : s
          ),
        }
      : p
  );
}

export function insertDetail(people: Person[], personId: string, sectionId: string, entry: PersonDetailEntry) {
  return mutateSection(people, personId, sectionId, (entries) => [...entries, entry]);
}

export function replaceDetail(
  people: Person[],
  personId: string,
  sectionId: string,
  tempId: string,
  entry: PersonDetailEntry
) {
  return mutateSection(people, personId, sectionId, (entries) =>
    entries.map((e) => (e.id === tempId ? entry : e))
  );
}

export function removeDetail(people: Person[], personId: string, sectionId: string, detailId: string) {
  return mutateSection(people, personId, sectionId, (entries) =>
    entries.filter((e) => e.id !== detailId)
  );
}

/** Edit a detail in place, or move it to another section, applying the patch. */
export function moveDetailBetweenSections(
  people: Person[],
  personId: string,
  fromSectionId: string,
  toSectionId: string,
  detailId: string,
  patch: { title?: string; note?: string; tags?: string[] }
): Person[] {
  const person = people.find((p) => p.id === personId);
  const existing = person?.sections
    .find((s) => s.id === fromSectionId)
    ?.entries.find((e) => e.id === detailId);
  if (!existing) return people;

  const updated: PersonDetailEntry = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.note !== undefined ? { note: patch.note || undefined } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
  };

  if (fromSectionId === toSectionId) {
    return mutateSection(people, personId, fromSectionId, (entries) =>
      entries.map((e) => (e.id === detailId ? updated : e))
    );
  }
  const removed = removeDetail(people, personId, fromSectionId, detailId);
  return insertDetail(removed, personId, toSectionId, updated);
}

/** The list-detail filter: "all" shows everything; a status id shows only matches. */
export function filterItemsByStatus(items: Item[], filter: string): Item[] {
  if (filter === "all") return items;
  return items.filter((i) => i.status === filter);
}

/**
 * Refresh the denormalized `subtitle` on every item linked to a person, so a
 * rename never leaves a stale name on a gift card. Only touches lists that hold
 * a matching item (stable identity elsewhere keeps re-renders minimal).
 */
export function renamePersonInItems(lists: List[], personId: string, name: string): List[] {
  return lists.map((l) => {
    let changed = false;
    const items = l.items.map((i) => {
      if (i.personId !== personId) return i;
      changed = true;
      return { ...i, subtitle: name };
    });
    return changed ? { ...l, items } : l;
  });
}

/** The derived label noun + item kind for a template (mirrors mapList on the server). */
export function deriveListMeta(template: ListTemplate): { noun: string; kind: ItemType } {
  const meta = TEMPLATE_META[template];
  return { noun: meta.noun, kind: meta.kind };
}
