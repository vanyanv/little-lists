// lib/field.ts — shared text-field styling so every sheet input, textarea, and
// note field matches: one radius, one border, one focus treatment. Compact
// inline editors (e.g. the item card) intentionally keep their own denser style.
import { focusRing } from "@/lib/a11y";

const fieldBase = `w-full rounded-xl border border-line text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none ${focusRing}`;

/** the primary / first field of a sheet — larger, a touch more emphasis */
export const inputPrimary = `${fieldBase} bg-cream-deep/50 px-4 py-3.5 text-[1.05rem] font-medium`;
/** a standard secondary field — notes, tags, extra details */
export const inputField = `${fieldBase} bg-cream-deep/40 px-4 py-3 text-[0.95rem]`;
/** a multi-line secondary field */
export const textareaField = `${inputField} resize-none`;
