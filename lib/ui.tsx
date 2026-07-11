"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ItemType, ListTemplate } from "./types";

/** a pocket scrap being filed through the add-item flow */
export interface ScrapRef {
  id: string;
  text: string;
  /** detected kind, when the pocket already knows what this is */
  kind?: ItemType;
}

export type SheetState =
  | { kind: "item"; listId?: string; scrap?: ScrapRef }
  | { kind: "move-item"; listId: string; itemId: string }
  | { kind: "pocket" }
  | { kind: "detail"; personId: string; sectionId?: string }
  | { kind: "list"; template?: ListTemplate }
  | { kind: "person" }
  | { kind: "edit-list"; listId: string }
  | { kind: "edit-person"; personId: string }
  | { kind: "edit-detail"; personId: string; sectionId: string; detailId: string }
  | null;

export type ConfirmTone = "default" | "danger";

export interface ConfirmOptions {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
}

export type ConfirmState = ConfirmOptions;

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  action?: ToastAction;
  onExpire?: () => void;
}

export interface ToastSignal {
  id: number;
  message: string;
  action?: ToastAction;
  onExpire?: () => void;
}

interface UiValue {
  sheet: SheetState;
  openItemSheet: (listId?: string) => void;
  openMoveItem: (listId: string, itemId: string) => void;
  openPocketSheet: () => void;
  openScrapFiling: (scrap: ScrapRef) => void;
  openDetailSheet: (personId: string, sectionId?: string) => void;
  openListSheet: (template?: ListTemplate) => void;
  openPersonSheet: () => void;
  openEditList: (listId: string) => void;
  openEditPerson: (personId: string) => void;
  openEditDetail: (personId: string, sectionId: string, detailId: string) => void;
  closeSheet: () => void;
  toast: ToastSignal | null;
  showToast: (message: string, opts?: ToastOptions) => void;
  /** dismiss the current toast; pass an id to only clear it if it's still current */
  dismissToast: (id?: number) => void;
  confirm: ConfirmState | null;
  openConfirm: (opts: ConfirmOptions) => void;
  closeConfirm: () => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<ToastSignal | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const toastSeq = useRef(0);

  const openItemSheet = useCallback((listId?: string) => {
    setSheet({ kind: "item", listId });
  }, []);
  const openMoveItem = useCallback(
    (listId: string, itemId: string) => setSheet({ kind: "move-item", listId, itemId }),
    []
  );
  const openPocketSheet = useCallback(() => setSheet({ kind: "pocket" }), []);
  const openScrapFiling = useCallback((scrap: ScrapRef) => setSheet({ kind: "item", scrap }), []);
  const openDetailSheet = useCallback((personId: string, sectionId?: string) => {
    setSheet({ kind: "detail", personId, sectionId });
  }, []);
  const openListSheet = useCallback(
    (template?: ListTemplate) => setSheet({ kind: "list", template }),
    []
  );
  const openPersonSheet = useCallback(() => setSheet({ kind: "person" }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const openEditList = useCallback((listId: string) => setSheet({ kind: "edit-list", listId }), []);
  const openEditPerson = useCallback((personId: string) => setSheet({ kind: "edit-person", personId }), []);
  const openEditDetail = useCallback(
    (personId: string, sectionId: string, detailId: string) =>
      setSheet({ kind: "edit-detail", personId, sectionId, detailId }),
    []
  );
  const openConfirm = useCallback((opts: ConfirmOptions) => setConfirm(opts), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const showToast = useCallback((message: string, opts?: ToastOptions) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, action: opts?.action, onExpire: opts?.onExpire });
  }, []);
  const dismissToast = useCallback(
    (id?: number) => setToast((cur) => (cur && (id == null || cur.id === id) ? null : cur)),
    []
  );

  const value = useMemo(
    () => ({
      sheet,
      openItemSheet,
      openMoveItem,
      openPocketSheet,
      openScrapFiling,
      openDetailSheet,
      openListSheet,
      openPersonSheet,
      openEditList,
      openEditPerson,
      openEditDetail,
      closeSheet,
      toast,
      showToast,
      dismissToast,
      confirm,
      openConfirm,
      closeConfirm,
    }),
    [
      sheet, openItemSheet, openMoveItem, openPocketSheet, openScrapFiling, openDetailSheet, openListSheet, openPersonSheet,
      openEditList, openEditPerson, openEditDetail, closeSheet,
      toast, showToast, dismissToast, confirm, openConfirm, closeConfirm,
    ]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
