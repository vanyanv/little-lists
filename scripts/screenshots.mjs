// Captures the public marketing pages at the viewport widths we support, and
// asserts the logged-out /app gate redirects to /sign-in. Standalone QA tool —
// NOT part of `next build`. Requires a running dev/preview server.
//
//   npm run dev            # in one terminal (or `npm run start` after a build)
//   npm run screenshots    # in another
//
// Override the target with BASE_URL=https://… npm run screenshots
//
// A signed-in /app screenshot needs stored Clerk auth, so it's intentionally
// left to live QA rather than captured here.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("test-results/screenshots");

const VIEWPORTS = [
  { w: 320, h: 720 },
  { w: 375, h: 812 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 768, h: 1024 },
  { w: 1440, h: 1000 },
];

const ROUTES = [
  { path: "/", slug: "landing" },
  { path: "/sign-in", slug: "sign-in" },
  { path: "/sign-up", slug: "sign-up" },
];

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  let overflowProblems = 0;

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await context.newPage();

      for (const route of ROUTES) {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
        const file = path.join(OUT_DIR, `${route.slug}-${vp.w}.png`);
        await page.screenshot({ path: file, fullPage: true });

        // Flag any horizontal overflow (1px tolerance for sub-pixel rounding).
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const flag = overflow > 1 ? `  ⚠️  H-OVERFLOW +${overflow}px` : "";
        if (overflow > 1) overflowProblems++;
        console.log(`  ✓ ${route.path.padEnd(9)} @ ${vp.w}px${flag}`);
      }
      await context.close();
    }

    // Auth gate: logged-out /app must land on /sign-in.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/app`, { waitUntil: "networkidle" });
    const landed = new URL(page.url()).pathname;
    const ok = landed.startsWith("/sign-in");
    console.log(`\n  ${ok ? "✓" : "✗"} logged-out /app → ${landed} ${ok ? "(redirects to sign-in)" : "(EXPECTED /sign-in)"}`);
    await context.close();

    console.log(`\nScreenshots saved to ${OUT_DIR}`);
    if (overflowProblems > 0) {
      console.error(`\n✗ ${overflowProblems} viewport(s) had horizontal overflow.`);
      process.exitCode = 1;
    }
    if (!ok) {
      console.error("✗ Auth gate did not redirect as expected.");
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
