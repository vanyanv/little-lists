"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  TEMPLATE_META,
  type Item,
  type List,
  type Person,
  type PersonDetailEntry,
  type Profile,
  type Scrap,
  type ThemeColor,
  type ViewMode,
} from "./types";
import { PERSON_SECTIONS } from "./people";
import { isExample } from "./onboarding";
import {
  clearExamplesAction,
  copyItemAction,
  createItemAction,
  createListAction,
  createPersonAction,
  createPersonDetailAction,
  createScrapAction,
  deleteItemAction,
  deleteListAction,
  deletePersonAction,
  deletePersonDetailAction,
  deleteScrapAction,
  duplicateListAction,
  fileScrapAction,
  moveItemAction,
  reorderItemsAction,
  saveScrapDetectionAction,
  setItemPinnedAction,
  setListPinnedAction,
  setListSortAction,
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
import { deriveListMeta, insertDetail, moveDetailBetweenSections, removeDetail, renamePersonInItems, replaceDetail } from "./store-helpers";
import { SCRAP_MAX_LENGTH, type DetectionResult } from "./scraps";
import { trackProductEvent } from "./analytics-client";
import type { SortMode } from "./sort";

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

/** pulses when a background save fails after its optimistic update was rolled back */
export interface SaveErrorSignal {
  id: string;
}

/** returned by the deferred deletes: exactly one of undo/commit should run */
export interface DeleteHandle {
  undo: () => void;
  commit: () => void;
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
  scraps: Scrap[];
  profile: Profile;
  celebration: CelebrationSignal | null;
  saveError: SaveErrorSignal | null;
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
    // `personId: null` unlinks the item (Partial<Item> alone can't express it;
    // omit-then-widen, since intersecting would narrow it back to string)
    patch: Omit<Partial<Item>, "personId"> & { personId?: string | null },
    opts?: { persist?: boolean }
  ) => void;
  deleteItem: (listId: string, itemId: string) => Promise<void>;
  setItemPinned: (listId: string, itemId: string, pinned: boolean) => void;
  moveItem: (fromListId: string, itemId: string, toListId: string) => void;
  copyItem: (fromItem: Item, toListId: string) => Promise<void>;
  setListView: (listId: string, view: ViewMode) => void;
  setListSort: (listId: string, sort: SortMode) => void;
  reorderItems: (listId: string, orderedIds: string[]) => void;
  addScrap: (text: string) => Promise<void>;
  deleteScrap: (scrapId: string) => DeleteHandle;
  setScrapDetection: (scrapId: string, detection: DetectionResult) => void;
  fileScrap: (scrapId: string, listId: string, input: CreateItemInput) => DeleteHandle;
  addPerson: (input: CreatePersonInput) => Promise<Person>;
  addPersonDetail: (personId: string, sectionId: string, draft: PersonDetailDraft) => Promise<void>;
  deletePersonDetail: (personId: string, sectionId: string, detailId: string) => DeleteHandle;
  setProfileTheme: (theme: ThemeColor) => void;
  dismissChecklist: () => void;
  /** drop the onboarding-seeded example items from every list */
  clearExamples: () => void;
  fireCelebration: (variant?: CelebrationVariant) => void;
  updateList: (listId: string, patch: Partial<Pick<List, "title" | "emoji" | "theme" | "template" | "defaultView">>) => void;
  /** pin a list to the top of Home (or unpin it) */
  setListPinned: (listId: string, pinned: boolean) => void;
  deleteList: (listId: string) => DeleteHandle;
  duplicateList: (listId: string) => Promise<List | null>;
  updatePerson: (personId: string, patch: Partial<Pick<Person, "name" | "emoji" | "theme" | "note" | "specialDay">>) => void;
  deletePerson: (personId: string) => DeleteHandle;
  updatePersonDetail: (
    personId: string,
    fromSectionId: string,
    detailId: string,
    patch: { title?: string; note?: string; tags?: string[]; toSectionId?: string }
  ) => void;
}

type StoreState = Pick<StoreValue, "lists" | "people" | "scraps" | "profile" | "celebration" | "saveError">;
type StoreActions = Omit<StoreValue, keyof StoreState>;

const StoreStateContext = createContext<StoreState | null>(null);
const StoreActionsContext = createContext<StoreActions | null>(null);

export interface StoreSeed {
  lists: List[];
  people: Person[];
  scraps: Scrap[];
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
  const [scraps, setScraps] = useState<Scrap[]>(seed.scraps);
  const [profile, setProfile] = useState<Profile>(seed.profile);
  const [celebration, setCelebration] = useState<CelebrationSignal | null>(null);

  // Actions must keep a stable identity across data mutations (see the
  // actions useMemo below), so any action that needs to read current state
  // outside of a setState updater reads it from a ref instead of closing
  // over the state value directly. The ref syncs in an effect (refs can't be
  // written during render); actions only read it from event handlers and
  // after awaits, by which point the commit's effects have run.
  const listsRef = useRef(lists);
  useEffect(() => { listsRef.current = lists; }, [lists]);

  const fireCelebration = useCallback((variant: CelebrationVariant = "confetti") => {
    setCelebration({ id: makeId("celebrate"), variant });
  }, []);

  const [saveError, setSaveError] = useState<SaveErrorSignal | null>(null);
  const signalSaveError = useCallback(() => {
    setSaveError({ id: makeId("save-error") });
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
    let before: List | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l;
        return { ...l, defaultView: view };
      })
    );
    if (isTempId(listId)) return; // not persisted yet; the swap will carry the view
    void setListViewAction(listId, view).catch((err) => {
      console.error("setListView failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? snap : l)));
      signalSaveError();
    });
  }, [signalSaveError]);

  const setListSort = useCallback<StoreValue["setListSort"]>((listId, sort) => {
    let before: List | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l;
        return { ...l, defaultSort: sort };
      })
    );
    if (isTempId(listId)) return;
    void setListSortAction(listId, sort).catch((err) => {
      console.error("setListSort failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? snap : l)));
      signalSaveError();
    });
  }, [signalSaveError]);

  const reorderItems = useCallback<StoreValue["reorderItems"]>((listId, orderedIds) => {
    let before: Item[] | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l.items;
        const byId = new Map(l.items.map((i) => [i.id, i]));
        // reflect the new order AND stamp concrete positions so custom sort holds
        const items = orderedIds
          .map((id, index): Item | null => {
            const it = byId.get(id);
            return it ? { ...it, position: index } : null;
          })
          .filter((i): i is Item => i !== null);
        return { ...l, items };
      })
    );
    trackProductEvent("feature_used", { feature: "items_reordered" });
    if (isTempId(listId)) return;
    void reorderItemsAction(listId, orderedIds).catch((err) => {
      console.error("reorderItems failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, items: snap } : l)));
      signalSaveError();
    });
  }, [signalSaveError]);

  const updateList = useCallback<StoreValue["updateList"]>((listId, patch) => {
    let before: List | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l;
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
    }).catch((err) => {
      console.error("updateList failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? snap : l)));
      signalSaveError();
    });
  }, [signalSaveError]);

  const setListPinned = useCallback<StoreValue["setListPinned"]>((listId, pinned) => {
    let before: List | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l;
        return { ...l, pinned };
      })
    );
    if (isTempId(listId)) return; // not persisted yet; created already unpinned
    void setListPinnedAction(listId, pinned).catch((err) => {
      console.error("setListPinned failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? snap : l)));
      signalSaveError();
    });
  }, [signalSaveError]);

  // Deferred delete: the list leaves the UI now, but the server delete only
  // fires on commit() (when the Undo toast expires). undo() simply restores
  // local state — nothing was sent, so nothing needs recreating.
  const deleteList = useCallback<StoreValue["deleteList"]>((listId) => {
    let removed: { list: List; index: number } | null = null;
    setLists((prev) => {
      const index = prev.findIndex((l) => l.id === listId);
      if (index === -1) return prev;
      removed = { list: prev[index], index };
      return prev.filter((l) => l.id !== listId);
    });
    const restore = () => {
      const snap = removed;
      if (!snap) return;
      setLists((prev) => {
        const next = [...prev];
        next.splice(Math.min(snap.index, next.length), 0, snap.list);
        return next;
      });
    };
    let settled = false;
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        restore();
      },
      commit: () => {
        if (settled) return;
        settled = true;
        if (isTempId(listId)) return;
        void deleteListAction(listId).catch((err) => {
          console.error("deleteList failed", err);
          restore();
          signalSaveError();
        });
      },
    };
  }, [signalSaveError]);

  const duplicateList = useCallback<StoreValue["duplicateList"]>(async (listId) => {
    const source = listsRef.current.find((l) => l.id === listId);
    if (!source || isTempId(listId)) return null;
    const tempId = makeId("list");
    const optimistic: List = {
      ...source,
      id: tempId,
      title: `${source.title} (copy)`,
      pinned: false,
      items: source.items.map((i) => ({ ...i, id: makeId("item") })),
    };
    setLists((prev) => [optimistic, ...prev]);
    trackProductEvent("feature_used", { feature: "list_duplicated" });
    try {
      const created = await duplicateListAction(listId);
      if (!created) throw new Error("duplicateList: no row");
      setLists((prev) => prev.map((l) => (l.id === tempId ? created : l)));
      return created;
    } catch (err) {
      console.error("duplicateList failed", err);
      setLists((prev) => prev.filter((l) => l.id !== tempId));
      signalSaveError();
      return null;
    }
  }, [signalSaveError]);

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
      personId: input.personId,
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
    let before: Item | undefined;
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) => {
                if (i.id !== itemId) return i;
                before = i;
                // normalize a null unlink to undefined so the merged item stays an Item
                const personId = patch.personId === undefined ? i.personId : patch.personId ?? undefined;
                return { ...i, ...patch, personId };
              }),
            }
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
      personId: patch.personId,
    }).catch((err) => {
      console.error("updateItem failed", err);
      const snap = before;
      if (snap) {
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? { ...l, items: l.items.map((i) => (i.id === itemId ? snap : i)) }
              : l
          )
        );
      }
      signalSaveError();
    });
  }, [signalSaveError]);

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

  const setItemPinned = useCallback<StoreValue["setItemPinned"]>((listId, itemId, pinned) => {
    let before: Item | undefined;
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) => {
                if (i.id !== itemId) return i;
                before = i;
                return { ...i, pinned };
              }),
            }
          : l
      )
    );
    if (pinned) trackProductEvent("feature_used", { feature: "item_pinned" });
    if (isTempId(itemId)) return;
    void setItemPinnedAction(itemId, pinned).catch((err) => {
      console.error("setItemPinned failed", err);
      const snap = before;
      if (snap)
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId ? { ...l, items: l.items.map((i) => (i.id === itemId ? snap : i)) } : l
          )
        );
      signalSaveError();
    });
  }, [signalSaveError]);

  const moveItem = useCallback<StoreValue["moveItem"]>((fromListId, itemId, toListId) => {
    if (fromListId === toListId) return;
    let moved: Item | undefined;
    let fromSnap: List | undefined;
    let toSnap: List | undefined;
    setLists((prev) => {
      const from = prev.find((l) => l.id === fromListId);
      moved = from?.items.find((i) => i.id === itemId);
      if (!moved) return prev;
      fromSnap = from;
      toSnap = prev.find((l) => l.id === toListId);
      const m = moved;
      return prev.map((l) => {
        if (l.id === fromListId) return { ...l, items: l.items.filter((i) => i.id !== itemId) };
        if (l.id === toListId)
          return { ...l, items: [{ ...m, position: null, fresh: true }, ...l.items] };
        return l;
      });
    });
    if (!moved) return;
    trackProductEvent("feature_used", { feature: "item_moved" });
    if (isTempId(itemId)) return;
    void moveItemAction(itemId, toListId)
      .then((row) => {
        if (row)
          setLists((prev) =>
            prev.map((l) =>
              l.id === toListId
                ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...row, fresh: true } : i)) }
                : l
            )
          );
      })
      .catch((err) => {
        console.error("moveItem failed", err);
        const fs = fromSnap;
        const ts = toSnap;
        if (fs && ts)
          setLists((prev) =>
            prev.map((l) => (l.id === fromListId ? fs : l.id === toListId ? ts : l))
          );
        signalSaveError();
      });
  }, [signalSaveError]);

  const copyItem = useCallback<StoreValue["copyItem"]>(async (fromItem, toListId) => {
    const tempId = makeId("item");
    const optimistic: Item = { ...fromItem, id: tempId, pinned: false, position: null, fresh: true };
    setLists((prev) =>
      prev.map((l) => (l.id === toListId ? { ...l, items: [optimistic, ...l.items] } : l))
    );
    trackProductEvent("feature_used", { feature: "item_copied" });
    try {
      const row = await copyItemAction(fromItem.id, toListId);
      if (!row) throw new Error("copyItem: no row");
      setLists((prev) =>
        prev.map((l) =>
          l.id === toListId
            ? { ...l, items: l.items.map((i) => (i.id === tempId ? { ...row, fresh: true } : i)) }
            : l
        )
      );
    } catch (err) {
      setLists((prev) =>
        prev.map((l) => (l.id === toListId ? { ...l, items: l.items.filter((i) => i.id !== tempId) } : l))
      );
      throw err;
    }
  }, []);

  /* ── scraps (the pocket) ───────────────────────────────────────── */

  const addScrap = useCallback<StoreValue["addScrap"]>(async (text) => {
    const trimmed = text.trim().slice(0, SCRAP_MAX_LENGTH);
    if (!trimmed) return;
    const tempId = makeId("scrap");
    const optimistic: Scrap = { id: tempId, text: trimmed, detection: null, createdAt: new Date().toISOString() };
    setScraps((prev) => [optimistic, ...prev]);
    try {
      const created = await createScrapAction(trimmed);
      setScraps((prev) => prev.map((s) => (s.id === tempId ? created : s)));
    } catch (err) {
      setScraps((prev) => prev.filter((s) => s.id !== tempId));
      throw err;
    }
  }, []);

  // Deferred delete, same contract as deleteList/deletePerson: gone from the UI
  // now, server delete only on commit() (Undo-toast expiry).
  const deleteScrap = useCallback<StoreValue["deleteScrap"]>((scrapId) => {
    let removed: { scrap: Scrap; index: number } | null = null;
    setScraps((prev) => {
      const index = prev.findIndex((s) => s.id === scrapId);
      if (index === -1) return prev;
      removed = { scrap: prev[index], index };
      return prev.filter((s) => s.id !== scrapId);
    });
    const restore = () => {
      const snap = removed;
      if (!snap) return;
      setScraps((prev) => {
        const next = [...prev];
        next.splice(Math.min(snap.index, next.length), 0, snap.scrap);
        return next;
      });
    };
    let settled = false;
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        restore();
      },
      commit: () => {
        if (settled) return;
        settled = true;
        if (isTempId(scrapId)) return;
        void deleteScrapAction(scrapId).catch((err) => {
          console.error("deleteScrap failed", err);
          restore();
          signalSaveError();
        });
      },
    };
  }, [signalSaveError]);

  const setScrapDetection = useCallback<StoreValue["setScrapDetection"]>((scrapId, detection) => {
    setScraps((prev) => prev.map((s) => (s.id === scrapId ? { ...s, detection } : s)));
    if (isTempId(scrapId)) return;
    // cache-only write: on failure the scrap just gets re-detected next open
    void saveScrapDetectionAction(scrapId, detection).catch((err) => {
      console.error("setScrapDetection failed", err);
    });
  }, []);

  // Deferred file: the scrap leaves the pocket and the item appears in its list
  // immediately; commit() persists both sides in one transaction, undo() puts
  // everything back untouched.
  const fileScrap = useCallback<StoreValue["fileScrap"]>((scrapId, listId, input) => {
    let removed: { scrap: Scrap; index: number } | null = null;
    setScraps((prev) => {
      const index = prev.findIndex((s) => s.id === scrapId);
      if (index === -1) return prev;
      removed = { scrap: prev[index], index };
      return prev.filter((s) => s.id !== scrapId);
    });
    const tempItemId = makeId("item");
    const optimistic: Item = {
      id: tempItemId,
      fresh: true,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle,
      note: input.note,
      status: input.status,
      tags: input.tags,
      emoji: input.emoji,
      seed: input.seed,
      imageUrl: input.imageUrl,
      personId: input.personId,
    };
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: [optimistic, ...l.items] } : l))
    );
    const restore = () => {
      const snap = removed;
      if (snap) {
        setScraps((prev) => {
          const next = [...prev];
          next.splice(Math.min(snap.index, next.length), 0, snap.scrap);
          return next;
        });
      }
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== tempItemId) } : l))
      );
    };
    let settled = false;
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        restore();
      },
      commit: () => {
        if (settled) return;
        settled = true;
        // an unswapped optimistic scrap has no server row to retire — plain create
        const persist = isTempId(scrapId)
          ? createItemAction(listId, input)
          : fileScrapAction(scrapId, listId, input);
        void persist
          .then((created) => {
            setLists((prev) =>
              prev.map((l) =>
                l.id === listId
                  ? { ...l, items: l.items.map((i) => (i.id === tempItemId ? { ...created, fresh: true } : i)) }
                  : l
              )
            );
          })
          .catch((err) => {
            console.error("fileScrap failed", err);
            restore();
            signalSaveError();
          });
      },
    };
  }, [signalSaveError]);

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
      let removedEntry: PersonDetailEntry | null = null;
      setPeople((prev) => {
        const person = prev.find((p) => p.id === personId);
        removedEntry =
          person?.sections.find((s) => s.id === sectionId)?.entries.find((e) => e.id === detailId) ?? null;
        return removeDetail(prev, personId, sectionId, detailId);
      });
      const restore = () => {
        const snap = removedEntry;
        if (!snap) return;
        setPeople((prev) => insertDetail(prev, personId, sectionId, snap));
      };
      let settled = false;
      return {
        undo: () => {
          if (settled) return;
          settled = true;
          restore();
        },
        commit: () => {
          if (settled) return;
          settled = true;
          if (isTempId(detailId)) return;
          void deletePersonDetailAction(detailId).catch((err) => {
            console.error("deletePersonDetail failed", err);
            restore();
            signalSaveError();
          });
        },
      };
    },
    [signalSaveError]
  );

  const updatePerson = useCallback<StoreValue["updatePerson"]>((personId, patch) => {
    let before: Person | undefined;
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id !== personId) return p;
        before = p;
        return { ...p, ...patch };
      })
    );
    // a rename must also refresh the denormalized subtitle on every linked item,
    // or gift cards keep showing the old name until reload. On failure we roll the
    // subtitle back with the same surgical helper rather than reverting the whole
    // lists array, which would clobber any unrelated mutation that landed mid-roundtrip.
    if (patch.name !== undefined) {
      const newName = patch.name;
      setLists((prev) => renamePersonInItems(prev, personId, newName));
    }
    if (isTempId(personId)) return;
    void updatePersonAction(personId, {
      name: patch.name,
      emoji: patch.emoji,
      theme: patch.theme,
      note: patch.note,
      specialDay: patch.specialDay,
    }).catch((err) => {
      console.error("updatePerson failed", err);
      const snap = before;
      if (snap) setPeople((prev) => prev.map((p) => (p.id === personId ? snap : p)));
      if (patch.name !== undefined && snap) {
        const oldName = snap.name;
        setLists((prev) => renamePersonInItems(prev, personId, oldName));
      }
      signalSaveError();
    });
  }, [signalSaveError]);

  // Deferred delete: the person leaves the UI now, but the server delete only
  // fires on commit() (when the Undo toast expires). undo() simply restores
  // local state — nothing was sent, so nothing needs recreating.
  const deletePerson = useCallback<StoreValue["deletePerson"]>((personId) => {
    let removed: { person: Person; index: number } | null = null;
    setPeople((prev) => {
      const index = prev.findIndex((p) => p.id === personId);
      if (index === -1) return prev;
      removed = { person: prev[index], index };
      return prev.filter((p) => p.id !== personId);
    });
    const restore = () => {
      const snap = removed;
      if (!snap) return;
      setPeople((prev) => {
        const next = [...prev];
        next.splice(Math.min(snap.index, next.length), 0, snap.person);
        return next;
      });
    };
    let settled = false;
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        restore();
      },
      commit: () => {
        if (settled) return;
        settled = true;
        if (isTempId(personId)) return;
        void deletePersonAction(personId).catch((err) => {
          console.error("deletePerson failed", err);
          restore();
          signalSaveError();
        });
      },
    };
  }, [signalSaveError]);

  const updatePersonDetail = useCallback<StoreValue["updatePersonDetail"]>(
    (personId, fromSectionId, detailId, patch) => {
      const toSectionId = patch.toSectionId ?? fromSectionId;
      let before: Person[] | undefined;
      setPeople((prev) => {
        before = prev;
        return moveDetailBetweenSections(prev, personId, fromSectionId, toSectionId, detailId, {
          title: patch.title,
          note: patch.note,
          tags: patch.tags,
        });
      });
      if (isTempId(detailId)) return;
      void updatePersonDetailAction(detailId, {
        title: patch.title,
        note: patch.note,
        tags: patch.tags,
        sectionId: patch.toSectionId,
      }).catch((err) => {
        console.error("updatePersonDetail failed", err);
        if (before) setPeople(before);
        signalSaveError();
      });
    },
    [signalSaveError]
  );

  /* ── profile ───────────────────────────────────────────────────── */

  const setProfileTheme = useCallback<StoreValue["setProfileTheme"]>((theme) => {
    let before: Profile | undefined;
    setProfile((p) => {
      before = p;
      return { ...p, theme };
    });
    void updateProfileAction({ themeColor: theme }).catch((err) => {
      console.error("setProfileTheme failed", err);
      if (before) setProfile(before);
      signalSaveError();
    });
  }, [signalSaveError]);

  const dismissChecklist = useCallback<StoreValue["dismissChecklist"]>(() => {
    let before: Profile | undefined;
    setProfile((p) => {
      before = p;
      return { ...p, checklistDismissed: true };
    });
    void updateProfileAction({ checklistDismissed: true }).catch((err) => {
      console.error("dismissChecklist failed", err);
      if (before) setProfile(before);
      signalSaveError();
    });
  }, [signalSaveError]);

  const clearExamples = useCallback<StoreValue["clearExamples"]>(() => {
    let before: List[] | undefined;
    setLists((prev) => {
      before = prev;
      return prev.map((l) => ({ ...l, items: l.items.filter((i) => !isExample(i.tags)) }));
    });
    void clearExamplesAction().catch((err) => {
      console.error("clearExamples failed", err);
      if (before) setLists(before);
      signalSaveError();
    });
  }, [signalSaveError]);

  const actions = useMemo<StoreActions>(
    () => ({
      addList,
      addItem,
      updateItem,
      deleteItem,
      setItemPinned,
      moveItem,
      copyItem,
      setListView,
      setListSort,
      reorderItems,
      addScrap,
      deleteScrap,
      setScrapDetection,
      fileScrap,
      updateList,
      setListPinned,
      deleteList,
      duplicateList,
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
      addList,
      addItem,
      updateItem,
      deleteItem,
      setItemPinned,
      moveItem,
      copyItem,
      setListView,
      setListSort,
      reorderItems,
      addScrap,
      deleteScrap,
      setScrapDetection,
      fileScrap,
      updateList,
      setListPinned,
      deleteList,
      duplicateList,
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

  const state = useMemo<StoreState>(
    () => ({ lists, people, scraps, profile, celebration, saveError }),
    [lists, people, scraps, profile, celebration, saveError]
  );

  return (
    <StoreActionsContext.Provider value={actions}>
      <StoreStateContext.Provider value={state}>{children}</StoreStateContext.Provider>
    </StoreActionsContext.Provider>
  );
}

export function useStore(): StoreValue {
  const state = useContext(StoreStateContext);
  const actions = useContext(StoreActionsContext);
  if (!state || !actions) throw new Error("useStore must be used within ListsProvider");
  return { ...state, ...actions };
}

export function useStoreActions(): StoreActions {
  const actions = useContext(StoreActionsContext);
  if (!actions) throw new Error("useStoreActions must be used within ListsProvider");
  return actions;
}

export function useStoreState(): StoreState {
  const state = useContext(StoreStateContext);
  if (!state) throw new Error("useStoreState must be used within ListsProvider");
  return state;
}

export function useList(id: string): List | undefined {
  return useStoreState().lists.find((l) => l.id === id);
}

export function usePerson(id: string): Person | undefined {
  return useStoreState().people.find((p) => p.id === id);
}

/* ── helpers ───────────────────────────────────────────────────────── */

export function isTempId(id: string): boolean {
  return (
    id.startsWith("list-") ||
    id.startsWith("item-") ||
    id.startsWith("person-") ||
    id.startsWith("detail-") ||
    id.startsWith("scrap-")
  );
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


