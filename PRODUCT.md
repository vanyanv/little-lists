# Product

## Register

product

## Users

People who want a cozy, private place to remember the little things they love and the little things about the people they love. Not power users or collectors-as-spreadsheet. They reach for Little Lists on their phone, in a calm moment, to jot a movie a friend recommended, a restaurant to try, a gift idea, or a small detail about someone they care about. Mobile-first, single-handed, low-pressure. The job to be done: "keep my little worlds in one warm place I trust, without it feeling like work."

## Product Purpose

Little Lists is a personal collection app for tracking media, places, gifts, dates, and people-notes as themed "little lists." Each list is made from a template (movie, book, music, food, place, gift, date, people, custom) that drives its statuses, copy, default view, and scrapbook sticker. Success looks like: the user opens it, adds something in a few taps, and the result feels like placing a sticker into a scrapbook they're proud of. It must feel personal and cared-for, never like a database UI.

## Brand Personality

Three words: **cozy, tactile, trustworthy.** Voice is warm and gently playful without being saccharine: "little world," "little thing," "Saved to your little world ✨." Calm and unhurried. Cute, but adult — the kind of cute that a grown person keeps on their home screen without embarrassment. Emotional goals: delight on small wins, calm everywhere else, and quiet confidence that nothing will be lost.

## Anti-references

The polished UI must NOT drift toward any of these (all confirmed by the user):

- **Generic SaaS dashboard** — crisp grey cards, data-dense tables, Inter-on-white, blue primary buttons, corporate coldness.
- **Childish / toy-like** — primary rainbow colors, Comic Sans energy, heavy bounce/elastic animations, oversized emoji, juvenile cuteness.
- **Flat Material / Android** — hard rectangular elevation, ripple effects, FAB conventions, harsh drop shadows.
- **Trendy glass / neon** — glassmorphism, neon gradients, dark-mode-first, heavy blur, wrong warmth and energy.

Also banned by house style: em dashes in UI copy, pure `#000`/`#fff`, side-stripe accent borders, gradient text, robotic labels ("Submit", "Create object", "No data", "Manage", "Entries").

## Design Principles

1. **Scrapbook, not spreadsheet.** Every interaction should feel like placing or arranging a keepsake. Tactile, rounded, warm. If a screen starts to feel like a data grid, it's wrong.
2. **Calm by default, delight on the moment that earns it.** Reserve motion and sparkle for genuine small wins (saving, completing). Everything else is quiet and steady. No confetti everywhere.
3. **Warm voice, always.** Copy is a person talking to a friend about their little world. No system language. Microcopy carries the brand more than any single visual.
4. **Mobile-first and one-handed.** Touch targets, bottom sheets, bottom nav, and the floating add button are the primary surface. Desktop is a courteous widening of the same layout, not a separate design.
5. **Preserve the established system.** A real token system already exists (OKLCH, per-list theming, soft shadows, pillowy radii). Polish means tightening consistency within it, never replacing it.

## Accessibility & Inclusion

- Target WCAG 2.1 AA for text contrast and interactive affordances.
- Every icon-only control (overflow menus, close buttons, the floating add button, nav items) needs an accessible label.
- Visible `:focus-visible` styling on all interactive elements, keyboard-operable where reasonable (sheets dismissable via Escape, focus handling on open).
- Honor `prefers-reduced-motion` (already wired globally); any new motion must degrade to instant.
- Color is never the sole carrier of meaning (status tone pairs with a label; theme is decorative).
- Form fields have real labels and warm, specific error text.
