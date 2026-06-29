"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type SheetState =
  | { kind: "item"; listId?: string }
  | { kind: "detail"; personId: string }
  | { kind: "list" }
  | { kind: "person" }
  | null;

export interface ToastSignal {
  id: number;
  message: string;
}

interface UiValue {
  sheet: SheetState;
  openItemSheet: (listId?: string) => void;
  openDetailSheet: (personId: string) => void;
  openListSheet: () => void;
  openPersonSheet: () => void;
  closeSheet: () => void;
  toast: ToastSignal | null;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<ToastSignal | null>(null);
  const toastSeq = useRef(0);

  const openItemSheet = useCallback((listId?: string) => {
    setSheet({ kind: "item", listId });
  }, []);
  const openDetailSheet = useCallback((personId: string) => {
    setSheet({ kind: "detail", personId });
  }, []);
  const openListSheet = useCallback(() => setSheet({ kind: "list" }), []);
  const openPersonSheet = useCallback(() => setSheet({ kind: "person" }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const showToast = useCallback((message: string) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({
      sheet,
      openItemSheet,
      openDetailSheet,
      openListSheet,
      openPersonSheet,
      closeSheet,
      toast,
      showToast,
      dismissToast,
    }),
    [sheet, openItemSheet, openDetailSheet, openListSheet, openPersonSheet, closeSheet, toast, showToast, dismissToast]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
