"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";

/** Bridges the store's save-failure signal into the toast channel. The store
 *  sits above UiProvider, so it can't show toasts itself; this tiny component
 *  lives inside both providers and translates. */
export function SaveErrorToast() {
  const { saveError } = useStore();
  const { showToast } = useUi();

  useEffect(() => {
    if (!saveError) return;
    showToast("That didn't save. Let's try again 🌿");
  }, [saveError, showToast]);

  return null;
}
