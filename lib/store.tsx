"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  TEMPLATE_META,
  type Item,
  type List,
  type Person,
  type PersonDetailEntry,
  type Profile,
  type ThemeColor,
  type ViewMode,
} from "./types";
import { PERSON_SECTIONS } from "./people";
import { isExample } from "./onboarding";
import {
  clearExamplesAction,
  createItemAction,
  createListAction,
  createPersonAction,
  createPersonDetailAction,
  deleteItemAction,
  deleteListAction,
  deletePersonAction,
  deletePersonDetailAction,
  setListPinnedAction,
  setListViewAction,
  updateItemAction,
  updateListAction,
  updatePersonAction,
  updatePersonDetailAction,
  updateProfileAction,
  type CreateItemInput,
  type CreateListInput,
  type CreatePersonInput,
} from "./actions";
import { deriveListMeta, insertDetail, moveDetailBetweenSections, removeDetail, replaceDetail } from "./store-helpers";

let _seq = 0;
function makeId(prefix = "x"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  _seq += 1;
  return `${prefix}-${_seq}`;
}

export type CelebrationVariant = "confetti" | "balloons";
export interface CelebrationSignal {
  id: string;
  variant: CelebrationVariant;
}

/** what the add-a-detail flow hands the store */
export interface PersonDetailDraft {
  title: string;
  note?: string;
  tags?: string[];
}

interface StoreValue {
  lists: List[];
  people: Person[];
  profile: Profile;
  celebration: CelebrationSignal | null;
  addList: (input: CreateListInput) => Promise<List>;
  addItem: (listId: string, item: CreateItemInput) => Promise<Item | null>;
  /**
   * Optimistically patch an item. By default the change is also persisted to
   * the server; pass `{ persist: false }` to update local state only (used by
   * the editor to debounce text edits — it flushes a single trailing write).
   */
  updateItem: (
    listId: string,
    itemId: string,
    patch: Partial<Item>,
    opts?: { persist?: boolean }
  ) => void;
  deleteItem: (listId: string, itemId: string) => Promise<void>;
  setListView: (listId: string, view: ViewMode) => void;
  addPerson: (input: CreatePersonInput) => Promise<Person>;
  addPersonDetail: (personId: string, sectionId: string, draft: PersonDetailDraft) => Promise<void>;
  deletePersonDetail: (personId: string, sectionId: string, detailId: string) => void;
  setProfileTheme: (theme: ThemeColor) => void;
  dismissChecklist: () => void;
  /** drop the onboarding-seeded example items from every list */
  clearExamples: () => void;
  fireCelebration: (variant?: CelebrationVariant) => void;
  updateList: (listId: string, patch: Partial<Pick<List, "title" | "emoji" | "theme" | "template" | "defaultView">>) => void;
  /** pin a list to the top of Home (or unpin it) */
  setListPinned: (listId: string, pinned: boolean) => void;
  deleteList: (listId: string) => void;
  updatePerson: (personId: string, patch: Partial<Pick<Person, "name" | "emoji" | "theme" | "note" | "specialDay">>) => void;
  deletePerson: (personId: string) => void;
  updatePersonDetail: (
    personId: string,
    fromSectionId: string,
    detailId: string,
    patch: { title?: string; note?: string; tags?: string[]; toSectionId?: string }
  ) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export interface StoreSeed {
  lists: List[];
  people: Person[];
  profile: Profile;
}

export function ListsProvider({
  seed,
  children,
}: {
  seed: StoreSeed;
  children: React.ReactNode;
}) {
  const [lists, setLists] = useState<List[]>(seed.lists);
  const [people, setPeople] = useState<Person[]>(seed.people);
  const [profile, setProfile] = useState<Profile>(seed.profile);
  const [celebration, setCelebration] = useState<CelebrationSignal | null>(null);

  const fireCelebration = useCallback((variant: CelebrationVariant = "confetti") => {
    setCelebration({ id: makeId("celebrate"), variant });
  }, []);

  /* ── lists ─────────────────────────────────────────────────────── */

  const addList = useCallback<StoreValue["addList"]>(async (input) => {
    const tempId = makeId("list");
    // optimistic: a freshly made world greets you at the top of Home
    const optimistic = mapDraftList(tempId, input);
    setLists((prev) => [optimistic, ...prev]);
    try {
      const created = await createListAction(input);
      setLists((prev) => prev.map((l) => (l.id === tempId ? created : l)));
      return created;
    } catch (err) {
      setLists((prev) => prev.filter((l) => l.id !== tempId));
      throw err;
    }
  }, []);

  const setListView = useCallback<StoreValue["setListView"]>((listId, view) => {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, defaultView: view } : l)));
    if (isTempId(listId)) return; // not persisted yet; the swap will carry the view
    void setListViewAction(listId, view).catch((err) =>
      console.error("setListView failed", err)
    );
  }, []);

  const updateList = useCallback<StoreValue["updateList"]>((listId, patch) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const next = { ...l, ...patch };
        if (patch.template !== undefined) {
          const meta = deriveListMeta(patch.template);
          next.noun = meta.noun;
          next.kind = meta.kind;
        }
        return next;
      })
    );
    if (isTempId(listId)) return;
    void updateListAction(listId, {
      title: patch.title,
      emoji: patch.emoji,
      theme: patch.theme,
      template: patch.template,
      defaultView: patch.defaultView,
    }).catch((err) => console.error("updateList failed", err));
  }, []);

  const setListPinned = useCallback<StoreValue["setListPinned"]>((listId, pinned) => {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, pinned } : l)));
    if (isTempId(listId)) return; // not persisted yet; created already unpinned
    void setListPinnedAction(listId, pinned).catch((err) =>
      console.error("setListPinned failed", err)
    );
  }, []);

  const deleteList = useCallback<StoreValue["deleteList"]>((listId) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    if (isTempId(listId)) return;
    void deleteListAction(listId).catch((err) => console.error("deleteList failed", err));
  }, []);

  /* ── items ─────────────────────────────────────────────────────── */

  const addItem = useCallback<StoreValue["addItem"]>(async (listId, input) => {
    const tempId = makeId("item");
    const optimistic: Item = {
      id: tempId,
      fresh: true,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle,
      note: input.note,
      status: input.status,
      tags: input.tags,
      emoji: input.emoji,
      seed: input.seed,
    };
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: [optimistic, ...l.items] } : l))
    );
    try {
      const created = await createItemAction(listId, input);
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => (i.id === tempId ? { ...created, fresh: true } : i)) }
            : l
        )
      );
      return created;
    } catch (err) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== tempId) } : l
        )
      );
      throw err;
    }
  }, []);

  const updateItem = useCallback<StoreValue["updateItem"]>((listId, itemId, patch, opts) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
          : l
      )
    );
    if (isTempId(itemId)) return; // will be persisted with its values on creation
    if (opts?.persist === false) return; // local-only; a trailing write flushes later
    void updateItemAction(itemId, {
      title: patch.title,
      subtitle: patch.subtitle,
      note: patch.note,
      status: patch.status,
      tags: patch.tags,
      emoji: patch.emoji,
      rating: patch.rating,
    }).catch((err) => console.error("updateItem failed", err));
  }, []);

  const deleteItem = useCallback<StoreValue["deleteItem"]>(async (listId, itemId) => {
    // Remember where the item lived so a failed server-delete can be rolled back
    // exactly, closing the window where an Undo would otherwise duplicate it.
    type Removed = { item: Item; index: number } | null;
    let removed: Removed = null;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const index = l.items.findIndex((i) => i.id === itemId);
        if (index === -1) return l;
        removed = { item: l.items[index], index };
        return { ...l, items: l.items.filter((i) => i.id !== itemId) };
      })
    );
    if (isTempId(itemId)) return;
    try {
      await deleteItemAction(itemId);
    } catch (err) {
      console.error("deleteItem failed", err);
      const snap = removed as Removed;
      if (snap) {
        setLists((prev) =>
          prev.map((l) => {
            if (l.id !== listId) return l;
            const items = [...l.items];
            items.splice(Math.min(snap.index, items.length), 0, snap.item);
            return { ...l, items };
          })
        );
      }
      throw err; // let the caller surface the warm error toast
    }
  }, []);

  /* ── people ────────────────────────────────────────────────────── */

  const addPerson = useCallback<StoreValue["addPerson"]>(async (input) => {
    const tempId = makeId("person");
    const optimistic = mapDraftPerson(tempId, input);
    setPeople((prev) => [optimistic, ...prev]);
    try {
      const created = await createPersonAction(input);
      setPeople((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      return created;
    } catch (err) {
      setPeople((prev) => prev.filter((p) => p.id !== tempId));
      throw err;
    }
  }, []);

  const addPersonDetail = useCallback<StoreValue["addPersonDetail"]>(
    async (personId, sectionId, draft) => {
      const title = draft.title.trim();
      if (!title) return;
      const tempId = makeId("detail");
      const optimistic: PersonDetailEntry = {
        id: tempId,
        title,
        note: draft.note?.trim() || undefined,
        tags: draft.tags ?? [],
      };
      setPeople((prev) => insertDetail(prev, personId, sectionId, optimistic));
      try {
        const { entry } = await createPersonDetailAction(personId, {
          sectionId,
          title,
          note: optimistic.note,
          tags: optimistic.tags,
        });
        setPeople((prev) => replaceDetail(prev, personId, sectionId, tempId, entry));
      } catch (err) {
        setPeople((prev) => removeDetail(prev, personId, sectionId, tempId));
        throw err;
      }
    },
    []
  );

  const deletePersonDetail = useCallback<StoreValue["deletePersonDetail"]>(
    (personId, sectionId, detailId) => {
      setPeople((prev) => removeDetail(prev, personId, sectionId, detailId));
      if (isTempId(detailId)) return;
      void deletePersonDetailAction(detailId).catch((err) =>
        console.error("deletePersonDetail failed", err)
      );
    },
    []
  );

  const updatePerson = useCallback<StoreValue["updatePerson"]>((personId, patch) => {
    setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, ...patch } : p)));
    if (isTempId(personId)) return;
    void updatePersonAction(personId, {
      name: patch.name,
      emoji: patch.emoji,
      theme: patch.theme,
      note: patch.note,
      specialDay: patch.specialDay,
    }).catch((err) => console.error("updatePerson failed", err));
  }, []);

  const deletePerson = useCallback<StoreValue["deletePerson"]>((personId) => {
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    if (isTempId(personId)) return;
    void deletePersonAction(personId).catch((err) => console.error("deletePerson failed", err));
  }, []);

  const updatePersonDetail = useCallback<StoreValue["updatePersonDetail"]>(
    (personId, fromSectionId, detailId, patch) => {
      const toSectionId = patch.toSectionId ?? fromSectionId;
      setPeople((prev) =>
        moveDetailBetweenSections(prev, personId, fromSectionId, toSectionId, detailId, {
          title: patch.title,
          note: patch.note,
          tags: patch.tags,
        })
      );
      if (isTempId(detailId)) return;
      void updatePersonDetailAction(detailId, {
        title: patch.title,
        note: patch.note,
        tags: patch.tags,
        sectionId: patch.toSectionId,
      }).catch((err) => console.error("updatePersonDetail failed", err));
    },
    []
  );

  /* ── profile ───────────────────────────────────────────────────── */

  const setProfileTheme = useCallback<StoreValue["setProfileTheme"]>((theme) => {
    setProfile((p) => ({ ...p, theme }));
    void updateProfileAction({ themeColor: theme }).catch((err) =>
      console.error("setProfileTheme failed", err)
    );
  }, []);

  const dismissChecklist = useCallback<StoreValue["dismissChecklist"]>(() => {
    setProfile((p) => ({ ...p, checklistDismissed: true }));
    void updateProfileAction({ checklistDismissed: true }).catch((err) =>
      console.error("dismissChecklist failed", err)
    );
  }, []);

  const clearExamples = useCallback<StoreValue["clearExamples"]>(() => {
    setLists((prev) =>
      prev.map((l) => ({ ...l, items: l.items.filter((i) => !isExample(i.tags)) }))
    );
    void clearExamplesAction().catch((err) => console.error("clearExamples failed", err));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      lists,
      people,
      profile,
      celebration,
      addList,
      addItem,
      updateItem,
      deleteItem,
      setListView,
      updateList,
      setListPinned,
      deleteList,
      addPerson,
      addPersonDetail,
      deletePersonDetail,
      updatePerson,
      deletePerson,
      updatePersonDetail,
      setProfileTheme,
      dismissChecklist,
      clearExamples,
      fireCelebration,
    }),
    [
      lists,
      people,
      profile,
      celebration,
      addList,
      addItem,
      updateItem,
      deleteItem,
      setListView,
      updateList,
      setListPinned,
      deleteList,
      addPerson,
      addPersonDetail,
      deletePersonDetail,
      updatePerson,
      deletePerson,
      updatePersonDetail,
      setProfileTheme,
      dismissChecklist,
      clearExamples,
      fireCelebration,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within ListsProvider");
  return ctx;
}

export function useList(id: string): List | undefined {
  return useStore().lists.find((l) => l.id === id);
}

export function usePerson(id: string): Person | undefined {
  return useStore().people.find((p) => p.id === id);
}

/* ── helpers ───────────────────────────────────────────────────────── */

function isTempId(id: string): boolean {
  return id.startsWith("list-") || id.startsWith("item-") || id.startsWith("person-") || id.startsWith("detail-");
}

// Build an optimistic list that mirrors what the server will return,
// deriving noun/kind from the template just like the server mapper does.
function mapDraftList(id: string, input: CreateListInput): List {
  const meta = TEMPLATE_META[input.template];
  return {
    id,
    title: input.title,
    emoji: input.emoji,
    theme: input.theme,
    noun: meta.noun,
    kind: meta.kind,
    template: input.template,
    defaultView: input.defaultView,
    pinned: false,
    items: [],
  };
}

function mapDraftPerson(id: string, input: CreatePersonInput): Person {
  return {
    id,
    name: input.name,
    emoji: input.emoji,
    theme: input.theme,
    note: input.note ?? "",
    specialDay: input.specialDay,
    sections: PERSON_SECTIONS.map((s) => ({
      id: s.id,
      label: s.label,
      emoji: s.emoji,
      kind: s.kind,
      entries: [],
    })),
  };
}


