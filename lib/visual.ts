import type { List, Person, ThemeColor, ViewMode } from "./types";
import { TEMPLATE_META } from "./types";

/** tiny stable string hash → positive int */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function themeClass(theme: ThemeColor): string {
  return `theme-${theme}`;
}

/** live, truthful subtitle: "1 little film saved" / "6 little films saved" / cozy empty copy */
export function listCountLabel(list: List): string {
  const n = list.items.length;
  if (n === 0) return "waiting for its first little thing";
  if (n === 1) return `1 ${TEMPLATE_META[list.template].nounSingular}`;
  return `${n} ${list.noun}`;
}

/** the profile's archive line: "3 little worlds · 14 little things · 2 people remembered" */
export function archiveSummary(lists: List[], people: Person[]): string {
  const worlds = lists.length;
  const things = lists.reduce((n, l) => n + l.items.length, 0);
  const parts = [
    `${worlds} little ${worlds === 1 ? "world" : "worlds"}`,
    `${things} little ${things === 1 ? "thing" : "things"}`,
  ];
  if (people.length > 0) {
    parts.push(`${people.length} ${people.length === 1 ? "person" : "people"} remembered`);
  }
  return parts.join(" · ");
}

// the landing demo's idle cycle walks the app's three browsing views in order
const VIEW_MODE_ORDER: ViewMode[] = ["grid", "list", "cozy"];

export function nextViewMode(mode: ViewMode): ViewMode {
  const i = VIEW_MODE_ORDER.indexOf(mode);
  return VIEW_MODE_ORDER[(i + 1) % VIEW_MODE_ORDER.length];
}
