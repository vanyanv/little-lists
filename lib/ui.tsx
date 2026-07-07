"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ListTemplate } from "./types";

export type SheetState =
  | { kind: "item"; listId?: string }
  | { kind: "detail"; personId: string }
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
}

export interface ToastSignal {
  id: number;
  message: string;
  action?: ToastAction;
}

interface UiValue {
  sheet: SheetState;
  openItemSheet: (listId?: string) => void;
  openDetailSheet: (personId: string) => void;
  openListSheet: (template?: ListTemplate) => void;
  openPersonSheet: () => void;
  openEditList: (listId: string) => void;
  openEditPerson: (personId: string) => void;
  openEditDetail: (personId: string, sectionId: string, detailId: string) => void;
  closeSheet: () => void;
  toast: ToastSignal | null;
  showToast: (message: string, opts?: ToastOptions) => void;
  dismissToast: () => void;
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
  const openDetailSheet = useCallback((personId: string) => {
    setSheet({ kind: "detail", personId });
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
    setToast({ id: toastSeq.current, message, action: opts?.action });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({
      sheet,
      openItemSheet,
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
      sheet, openItemSheet, openDetailSheet, openListSheet, openPersonSheet,
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
