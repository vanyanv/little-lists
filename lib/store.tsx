"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Item, List, Person, Profile, ThemeColor } from "./types";
import { MOCK_LISTS, MOCK_PEOPLE, MOCK_PROFILE } from "./mock-data";

/* Prototype persistence: localStorage stands in for a backend so the little
   worlds you create survive reloads and revisiting a list's URL. */
const STORAGE_KEY = "little-lists:v1";

interface PersistShape {
  lists?: List[];
  people?: Person[];
  profile?: Profile;
}

function readPersisted(): PersistShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistShape) : null;
  } catch {
    return null;
  }
}

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

interface StoreValue {
  lists: List[];
  people: Person[];
  profile: Profile;
  /** false until saved state has been read from localStorage on the client */
  hydrated: boolean;
  celebration: CelebrationSignal | null;
  addList: (input: Omit<List, "id" | "items">) => List;
  addItem: (listId: string, item: Omit<Item, "id" | "fresh">) => Item | null;
  updateItem: (listId: string, itemId: string, patch: Partial<Item>) => void;
  clearList: (listId: string) => void;
  addPersonDetail: (personId: string, sectionId: string, entry: string) => void;
  setProfileTheme: (theme: ThemeColor) => void;
  fireCelebration: (variant?: CelebrationVariant) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [lists, setLists] = useState<List[]>(() =>
    MOCK_LISTS.map((l) => ({ ...l, items: l.items.map((i) => ({ ...i })) }))
  );
  const [people, setPeople] = useState<Person[]>(() =>
    MOCK_PEOPLE.map((p) => ({ ...p, sections: p.sections.map((s) => ({ ...s, entries: [...s.entries] })) }))
  );
  const [profile, setProfile] = useState<Profile>(MOCK_PROFILE);
  const [celebration, setCelebration] = useState<CelebrationSignal | null>(null);

  // We seed from mock data so server + first client render match, then swap in
  // any saved state on mount. `hydrated` gates the writer effect so we never
  // clobber persisted lists with the mock seed before we've read them.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const saved = readPersisted();
    if (saved) {
      if (saved.lists) setLists(saved.lists);
      if (saved.people) setPeople(saved.people);
      if (saved.profile) setProfile(saved.profile);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lists, people, profile })
      );
    } catch {
      /* storage unavailable or full — the app keeps working in-memory */
    }
  }, [hydrated, lists, people, profile]);

  const fireCelebration = useCallback((variant: CelebrationVariant = "confetti") => {
    setCelebration({ id: makeId("celebrate"), variant });
  }, []);

  const addList = useCallback<StoreValue["addList"]>((input) => {
    const newList: List = { ...input, id: makeId("list"), items: [] };
    // prepend so the freshly made little world greets you as the home hero
    setLists((prev) => [newList, ...prev]);
    return newList;
  }, []);

  const addItem = useCallback<StoreValue["addItem"]>((listId, item) => {
    const newItem: Item = { ...item, id: makeId("item"), fresh: true };
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: [newItem, ...l.items] } : l
      )
    );
    return newItem;
  }, []);

  const updateItem = useCallback<StoreValue["updateItem"]>(
    (listId, itemId, patch) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: l.items.map((i) =>
                  i.id === itemId ? { ...i, ...patch } : i
                ),
              }
            : l
        )
      );
    },
    []
  );

  const clearList = useCallback<StoreValue["clearList"]>((listId) => {
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: [] } : l))
    );
  }, []);

  const addPersonDetail = useCallback<StoreValue["addPersonDetail"]>(
    (personId, sectionId, entry) => {
      const clean = entry.trim();
      if (!clean) return;
      setPeople((prev) =>
        prev.map((p) =>
          p.id === personId
            ? {
                ...p,
                sections: p.sections.map((s) =>
                  s.id === sectionId ? { ...s, entries: [...s.entries, clean] } : s
                ),
              }
            : p
        )
      );
    },
    []
  );

  const setProfileTheme = useCallback<StoreValue["setProfileTheme"]>((theme) => {
    setProfile((p) => ({ ...p, theme }));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      lists,
      people,
      profile,
      hydrated,
      celebration,
      addList,
      addItem,
      updateItem,
      clearList,
      addPersonDetail,
      setProfileTheme,
      fireCelebration,
    }),
    [
      lists,
      people,
      profile,
      hydrated,
      celebration,
      addList,
      addItem,
      updateItem,
      clearList,
      addPersonDetail,
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
