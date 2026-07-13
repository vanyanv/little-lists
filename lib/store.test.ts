import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { StoreSeed } from "./store";
import * as Store from "./store";

// ── minimal hooks harness ──────────────────────────────────────────────
//
// This repo's vitest runs with `environment: "node"` (no DOM) and doesn't
// have @testing-library/react as a dependency, so ListsProvider can't be
// mounted with a real renderer. Instead we swap in slot-based stand-ins for
// useState/useCallback/useMemo/useRef/useEffect (keeping every other React
// export, including createContext, real) that behave exactly like React's for
// a single component instance with no conditional hook calls — which is all
// ListsProvider is. This lets us call `ListsProvider(...)` directly, twice
// (an initial "render" and one after a real state mutation), and assert on
// the actual object identities React's memoization would produce, instead
// of just asserting on the source text.
const { hookState, mockUseState, mockUseCallback, mockUseMemo, mockUseRef, mockUseEffect } = vi.hoisted(() => {
  const hookState = { cells: [] as Array<{ value?: unknown; fn?: unknown; deps?: unknown[]; current?: unknown }>, index: 0 };

  function depsEqual(a: unknown[] | undefined, b: unknown[]) {
    if (!a || a.length !== b.length) return false;
    return a.every((v, i) => Object.is(v, b[i]));
  }

  function mockUseState(initial: unknown) {
    const idx = hookState.index++;
    if (!(idx in hookState.cells)) {
      hookState.cells[idx] = { value: typeof initial === "function" ? (initial as () => unknown)() : initial };
    }
    const cell = hookState.cells[idx];
    const setState = (updater: unknown) => {
      cell.value = typeof updater === "function" ? (updater as (prev: unknown) => unknown)(cell.value) : updater;
    };
    return [cell.value, setState];
  }

  function mockUseCallback(fn: unknown, deps: unknown[]) {
    const idx = hookState.index++;
    const cell = hookState.cells[idx];
    if (cell && depsEqual(cell.deps, deps)) return cell.fn;
    hookState.cells[idx] = { fn, deps };
    return fn;
  }

  function mockUseMemo(factory: () => unknown, deps: unknown[]) {
    const idx = hookState.index++;
    const cell = hookState.cells[idx];
    if (cell && depsEqual(cell.deps, deps)) return cell.value;
    const value = factory();
    hookState.cells[idx] = { value, deps };
    return value;
  }

  function mockUseRef(initial: unknown) {
    const idx = hookState.index++;
    if (!(idx in hookState.cells)) hookState.cells[idx] = { current: initial };
    return hookState.cells[idx];
  }

  // Runs the effect synchronously when its deps change (real React defers to
  // after commit; for this renderer-less harness "immediately" is the closest
  // faithful point). Cleanups are ignored — ListsProvider's only effect (the
  // listsRef sync) has none.
  function mockUseEffect(fn: () => void | (() => void), deps?: unknown[]) {
    const idx = hookState.index++;
    const cell = hookState.cells[idx];
    if (cell && deps && depsEqual(cell.deps, deps)) return;
    hookState.cells[idx] = { deps };
    fn();
  }

  return { hookState, mockUseState, mockUseCallback, mockUseMemo, mockUseRef, mockUseEffect };
});

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: mockUseState,
    useCallback: mockUseCallback,
    useMemo: mockUseMemo,
    useRef: mockUseRef,
    useEffect: mockUseEffect,
  };
});

// lib/store.tsx renders JSX and calls React hooks, so it can't be exercised
// with a plain render in this repo's vitest setup: the test environment is
// "node" (no DOM) and @testing-library/react isn't a dependency (see
// vitest.config.ts / package.json). Per the perf split's requirement — the
// `useStoreActions()` value must NEVER change identity across a data
// mutation — we assert the invariant the identity guarantee actually rests
// on: every action's `useCallback` dep array is free of raw state, and the
// `actions` useMemo depends only on those (permanently-stable) callbacks
// while `state` carries the six data fields.
const STORE_SOURCE_PATH = path.join(__dirname, "store.tsx");
const source = readFileSync(STORE_SOURCE_PATH, "utf8");

const STATE_FIELDS = ["lists", "people", "scraps", "profile", "celebration", "saveError"];

function assertNoStateField(depBlock: string, label: string) {
  for (const field of STATE_FIELDS) {
    // matches a bare identifier ("lists") but not a longer one that merely
    // starts with it ("listsRef") or is a property access ("x.lists").
    const re = new RegExp(`(?<![\\w.])${field}(?!\\w)`);
    expect(depBlock, `${label} must not close over raw state "${field}":\n${depBlock}`).not.toMatch(re);
  }
}

describe("store: actions/state context split", () => {
  it("exports useStore (unchanged), useStoreActions, useStoreState, useList, usePerson", () => {
    expect(typeof Store.useStore).toBe("function");
    expect(typeof Store.useStoreActions).toBe("function");
    expect(typeof Store.useStoreState).toBe("function");
    expect(typeof Store.useList).toBe("function");
    expect(typeof Store.usePerson).toBe("function");
  });

  it("gives every useCallback action a dep array free of raw state (lists/people/scraps/profile/etc.)", () => {
    // useCallback closings appear in two shapes in this file:
    //   inline:     `  }, [deps]);`
    //   multi-line: `    },\n    [deps]\n  );` (used when the callback's own
    //               signature spans multiple lines, e.g. addPersonDetail,
    //               deletePersonDetail, updatePersonDetail). Both must be
    //               captured, or a raw-state regression in one of the
    //               multi-line callbacks would slip past this audit
    //               undetected.
    const inlineDeps = [...source.matchAll(/^ {2}\}, (\[[^\]]*\])\);$/gm)].map((m) => m[1]);
    const multilineDeps = [...source.matchAll(/^ {4}\},\n {4}(\[[^\]]*\])\n {2}\);$/gm)].map((m) => m[1]);
    const depArrayLines = [...inlineDeps, ...multilineDeps];
    // sanity: ListsProvider defines exactly 29 stable callbacks
    // (fireCelebration, signalSaveError, and the 27 StoreValue actions) — if
    // this drops below that, the extraction stopped matching real
    // useCallback closings and the test would be vacuously true.
    expect(depArrayLines.length).toBeGreaterThanOrEqual(29);
    for (const depArray of depArrayLines) {
      assertNoStateField(depArray, `useCallback dep array ${depArray}`);
    }
  });

  it("fixes duplicateList to read the source list from a ref instead of closing over `lists`", () => {
    expect(source).toMatch(/const listsRef = useRef\(lists\);/);
    expect(source).toMatch(/listsRef\.current = lists;/);
    expect(source).toMatch(/const source = listsRef\.current\.find\(\(l\) => l\.id === listId\);/);
    // and its own dep array must be exactly [signalSaveError]
    const duplicateListBlock = source.match(
      /const duplicateList = useCallback<StoreValue\["duplicateList"\]>\(async \(listId\) => \{[\s\S]*?\n {2}\}, (\[[^\]]*\])\);/
    );
    expect(duplicateListBlock).not.toBeNull();
    expect(duplicateListBlock![1]).toBe("[signalSaveError]");
  });

  it("memoizes `actions` over only the stable callbacks and `state` over only the six data fields", () => {
    const match = source.match(
      /const actions = useMemo<StoreActions>\(([\s\S]*?)\n {2}\);\n\n {2}const state = useMemo<StoreState>\(([\s\S]*?)\n {2}\);/
    );
    expect(match).not.toBeNull();
    const [, actionsBlock, stateBlock] = match!;

    assertNoStateField(actionsBlock, "the `actions` useMemo");

    for (const field of STATE_FIELDS) {
      expect(stateBlock, `the \`state\` useMemo must include "${field}"`).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it("keeps useList/usePerson reading from useStoreState (not useStore)", () => {
    expect(source).toMatch(/export function useList\(id: string\): List \| undefined \{\s*\n\s*return useStoreState\(\)\.lists\.find/);
    expect(source).toMatch(/export function usePerson\(id: string\): Person \| undefined \{\s*\n\s*return useStoreState\(\)\.people\.find/);
  });

  it("keeps the actions object identity-stable across a real data mutation (mocked-hooks render)", () => {
    hookState.cells = [];
    hookState.index = 0;

    // A "list-" prefixed id is treated as not-yet-persisted (isTempId), so
    // setListView short-circuits before its fire-and-forget server call —
    // keeping this a fully synchronous, network-free mutation.
    const seed: StoreSeed = {
      lists: [
        {
          id: "list-1",
          title: "Movies",
          emoji: "🎬",
          theme: "blush",
          noun: "movies",
          kind: "movie",
          template: "movie",
          pinned: false,
          items: [],
        },
      ],
      people: [],
      scraps: [],
      profile: { name: "Test", avatarEmoji: "🙂", theme: "blush", demoSeeded: false, checklistDismissed: false },
    };

    // "Render" 1 (mount): call the provider function body directly under
    // the mocked hooks above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element1 = (Store.ListsProvider as any)({ seed, children: null });
    const actions1 = element1.props.value;
    const state1 = element1.props.children.props.value;
    expect(state1.lists[0].defaultView).toBeUndefined();

    // Trigger a real optimistic mutation via an action captured from render 1.
    actions1.setListView("list-1", "grid");

    // "Render" 2: simulate React re-invoking the component after the
    // setState above (same instance — only the hook index resets).
    hookState.index = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element2 = (Store.ListsProvider as any)({ seed, children: null });
    const actions2 = element2.props.value;
    const state2 = element2.props.children.props.value;

    // The mutation landed...
    expect(state2.lists[0].defaultView).toBe("grid");
    expect(Object.is(state1, state2)).toBe(false);
    // ...but the actions bag's identity is untouched. This is the entire
    // point of the state/actions context split.
    expect(Object.is(actions1, actions2)).toBe(true);
    expect(actions2.setListView).toBe(actions1.setListView);
    expect(actions2.duplicateList).toBe(actions1.duplicateList);
  });
});
