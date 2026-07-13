"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** False during SSR and hydration, true once mounted on the client — the
 *  lint-safe gate for portals and other browser-only subtrees. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
