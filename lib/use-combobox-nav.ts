"use client";

// lib/use-combobox-nav.ts — client-only combobox keyboard navigation hook,
// split out of lib/a11y.ts so that module can stay server-safe (WAI-ARIA combobox pattern).

import { useState, type KeyboardEvent } from "react";

export interface ComboboxNav {
  /** id of the active option for the input's aria-activedescendant, or undefined */
  activeId: string | undefined;
  /** index of the active option in `ids`, or -1 when there are none */
  activeIndex: number;
  /** point the active descendant at an option (e.g. on pointer hover) */
  setActiveIndex: (index: number) => void;
  /** attach to the combobox input's onKeyDown */
  onKeyDown: (e: KeyboardEvent) => void;
}

/**
 * The keyboard half of a listbox-popup combobox: DOM focus stays in the input
 * while Arrow keys move a virtual "active" option (exposed via aria-activedescendant),
 * Enter activates it, and Escape asks the caller to clear/close. Rendering, focus,
 * and scroll-into-view stay with the caller — this hook only owns the active index.
 *
 * Small on purpose (reused by the add-item search in a later slice): pass the flat,
 * in-DOM order of option ids and two callbacks. The active index resets to the first
 * option whenever the id set changes, so a new set of results is immediately actionable.
 */
export function useComboboxNav({
  ids,
  onSelect,
  onEscape,
}: {
  ids: string[];
  onSelect: (id: string, index: number) => void;
  onEscape: () => void;
}): ComboboxNav {
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset to the first option when the results change. Storing the previous key
  // in state (not a ref) is the React "adjust state during render" pattern.
  const key = ids.join(" ");
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    if (activeIndex !== 0) setActiveIndex(0);
  }

  const index = ids.length === 0 ? -1 : Math.min(activeIndex, ids.length - 1);

  const onKeyDown = (e: KeyboardEvent) => {
    // an IME commit (Japanese/Chinese/Korean composition) arrives as Enter with
    // isComposing set — that keystroke belongs to the composition, never to us
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      if (ids.length === 0) return;
      e.preventDefault();
      setActiveIndex(((index < 0 ? -1 : index) + 1) % ids.length);
    } else if (e.key === "ArrowUp") {
      if (ids.length === 0) return;
      e.preventDefault();
      setActiveIndex(((index < 0 ? 0 : index) - 1 + ids.length) % ids.length);
    } else if (e.key === "Enter") {
      if (index < 0) return;
      e.preventDefault();
      onSelect(ids[index], index);
    } else if (e.key === "Escape") {
      onEscape();
    }
  };

  return {
    activeId: index >= 0 ? ids[index] : undefined,
    activeIndex: index,
    setActiveIndex,
    onKeyDown,
  };
}
