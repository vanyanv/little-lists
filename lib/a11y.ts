// lib/a11y.ts — shared keyboard-focus affordances (WCAG 2.4.7), warm-tinted to match the system.

import { useState, type KeyboardEvent } from "react";

/** focus ring for light surfaces: chips, cards, inputs, menu items, links */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
/** focus ring for dark (ink) surfaces: the FAB and primary ink buttons */
export const focusRingOnDark =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink";
/** inset ring for elements inside overflow-hidden cards / the nav pill */
export const focusRingInset =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40";
/**
 * focus ring for a stretched-link card: the Link itself only wraps the title, and an
 * `::after` pseudo-element (positioned by the card root, not the Link) stretches over
 * the whole tappable surface. The ring has to be drawn on that `::after` box — not the
 * Link's own small box — so keyboard focus still outlines the entire card.
 */
export const focusRingStretched =
  "outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ink/40 focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-paper";

/* combobox keyboard navigation (WAI-ARIA combobox pattern) */

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
