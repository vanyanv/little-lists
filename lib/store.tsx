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
import {
  createItemAction,
  createListAction,
  createPersonAction,
  createPersonDetailAction,
  deleteItemAction,
  deletePersonDetailAction,
  setListViewAction,
  updateItemAction,
  updateProfileAction,
  type CreateItemInput,
  type CreateListInput,
  type CreatePersonInput,
} from "./actions";
import { insertDetail, removeDetail, replaceDetail } from "./store-helpers";

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
  /** kept for the list page's "not really missing, still loading" guard */
  hydrated: boolean;
  celebration: CelebrationSignal | null;
  addList: (input: CreateListInput) => Promise<List>;
  addItem: (listId: string, item: CreateItemInput) => Promise<Item | null>;
  updateItem: (listId: string, itemId: string, patch: Partial<Item>) => void;
  deleteItem: (listId: string, itemId: string) => void;
  setListView: (listId: string, view: ViewMode) => void;
  addPerson: (input: CreatePersonInput) => Promise<Person>;
  addPersonDetail: (personId: string, sectionId: string, draft: PersonDetailDraft) => Promise<void>;
  deletePersonDetail: (personId: string, sectionId: string, detailId: string) => void;
  setProfileTheme: (theme: ThemeColor) => void;
  fireCelebration: (variant?: CelebrationVariant) => void;
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

  const updateItem = useCallback<StoreValue["updateItem"]>((listId, itemId, patch) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
          : l
      )
    );
    if (isTempId(itemId)) return; // will be persisted with its values on creation
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

  const deleteItem = useCallback<StoreValue["deleteItem"]>((listId, itemId) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
      )
    );
    if (isTempId(itemId)) return;
    void deleteItemAction(itemId).catch((err) => console.error("deleteItem failed", err));
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

  /* ── profile ───────────────────────────────────────────────────── */

  const setProfileTheme = useCallback<StoreValue["setProfileTheme"]>((theme) => {
    setProfile((p) => ({ ...p, theme }));
    void updateProfileAction({ themeColor: theme }).catch((err) =>
      console.error("setProfileTheme failed", err)
    );
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      lists,
      people,
      profile,
      hydrated: true,
      celebration,
      addList,
      addItem,
      updateItem,
      deleteItem,
      setListView,
      addPerson,
      addPersonDetail,
      deletePersonDetail,
      setProfileTheme,
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
      addPerson,
      addPersonDetail,
      deletePersonDetail,
      setProfileTheme,
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
    sections: PERSON_SECTIONS.map((s) => ({
      id: s.id,
      label: s.label,
      emoji: s.emoji,
      kind: s.kind,
      entries: [],
    })),
  };
}


