# Runtime typing probe (run via Playwright MCP)

Goal: measure main-thread time to process a burst of keystrokes in the item
editor, on a deliberately large list so the per-keystroke re-render cost is
visible on desktop. Compare baseline vs post-Slice-2.

1. Sign in (dev): sign up `perf+clerk_test@example.com`, code `424242`.
2. Create a list, then seed ~80 items. Fastest path: in the browser console,
   loop `window`-exposed store isn't available — instead add via SQL:
   `INSERT INTO "ListItem" (…) select …` OR click-add ~80 (slow). Prefer SQL
   against the dev list id (see verify skill for the Neon connection).
3. Open the list, expand one item's editor.
4. In the page, run this probe via browser_evaluate and record `ms`:
   ```js
   () => {
     const input = document.querySelector('input[id^="item-title-"]');
     input.focus();
     const t0 = performance.now();
     for (let i = 0; i < 25; i++) {
       input.value += "x";
       input.dispatchEvent(new Event("input", { bubbles: true }));
     }
     // force React to flush by reading layout, then measure
     void input.offsetHeight;
     return { ms: +(performance.now() - t0).toFixed(1) };
   }
   ```
5. Record the number in perf-baseline.md. Post-Slice-2 it should drop sharply
   (baseline re-renders all ~80 cards per keystroke; after, only the edited
   card's local state updates).
