// QA screenshots for Little Lists. Standalone tool — NOT part of `next build`.
// Requires a running dev/preview server.
//
//   npm run dev            # in one terminal (or `npm run start` after a build)
//   npm run screenshots    # in another
//
// Override the target with BASE_URL=https://… npm run screenshots
//
// By default this captures the three PUBLIC routes (/, /sign-in, /sign-up) at
// every supported width and asserts the logged-out /app gate redirects to
// /sign-in.
//
// AUTHENTICATED screens (/app and friends) need a Clerk session, so they're
// opt-in: point STORAGE_STATE at a Playwright storageState JSON that carries a
// signed-in session and the script adds a second pass over Home, a list detail
// (grid / list / cozy), People, a person detail, Profile, plus the create-list
// and add-item sheets.
//
//   1. Sign in once and save the session:
//        npx playwright open --save-storage=.auth/state.json http://localhost:3000/sign-in
//      (complete sign-in in the window, then close it)
//   2. STORAGE_STATE=.auth/state.json npm run screenshots
//
// .auth/ and test-results/ are git-ignored, so no secrets or output get committed.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE = process.env.STORAGE_STATE;
const OUT_DIR = path.resolve("test-results/screenshots");

const VIEWPORTS = [
  { w: 320, h: 720 },
  { w: 375, h: 812 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 768, h: 1024 },
  { w: 1440, h: 1000 },
];

const PUBLIC_ROUTES = [
  { path: "/", slug: "landing" },
  { path: "/sign-in", slug: "sign-in" },
  { path: "/sign-up", slug: "sign-up" },
];

/** scrollWidth − clientWidth, with a 1px tolerance for sub-pixel rounding */
async function horizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  let overflowProblems = 0;

  try {
    // ---- Public routes (always) ----
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await context.newPage();

      for (const route of PUBLIC_ROUTES) {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
        await page.screenshot({ path: path.join(OUT_DIR, `${route.slug}-${vp.w}.png`), fullPage: true });

        const overflow = await horizontalOverflow(page);
        if (overflow > 1) overflowProblems++;
        console.log(`  ✓ ${route.path.padEnd(9)} @ ${vp.w}px${overflow > 1 ? `  ⚠️  H-OVERFLOW +${overflow}px` : ""}`);
      }
      await context.close();
    }

    // Auth gate: logged-out /app must land on /sign-in.
    const gateCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const gatePage = await gateCtx.newPage();
    await gatePage.goto(`${BASE_URL}/app`, { waitUntil: "networkidle" });
    const landed = new URL(gatePage.url()).pathname;
    const gateOk = landed.startsWith("/sign-in");
    console.log(`\n  ${gateOk ? "✓" : "✗"} logged-out /app → ${landed} ${gateOk ? "(redirects to sign-in)" : "(EXPECTED /sign-in)"}`);
    await gateCtx.close();

    // ---- Authenticated screens (opt-in via STORAGE_STATE) ----
    let authProblems = 0;
    if (STORAGE_STATE) {
      console.log(`\nAuthenticated pass (storageState: ${STORAGE_STATE})`);
      authProblems = await captureAuthenticated(browser);
    } else {
      console.log("\n  ℹ︎ Skipping authenticated screens — set STORAGE_STATE to capture them (see header).");
    }

    console.log(`\nScreenshots saved to ${OUT_DIR}`);
    if (overflowProblems > 0) {
      console.error(`\n✗ ${overflowProblems} public viewport(s) had horizontal overflow.`);
      process.exitCode = 1;
    }
    if (!gateOk) {
      console.error("✗ Auth gate did not redirect as expected.");
      process.exitCode = 1;
    }
    if (authProblems > 0) {
      console.error(`\n✗ ${authProblems} authenticated viewport(s) had horizontal overflow.`);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

/**
 * Drives the signed-in surface. Auto-discovers a list and a person from the
 * DOM so it doesn't need hard-coded IDs. Each capture is isolated so one
 * missing screen never aborts the rest. Returns the horizontal-overflow count.
 */
async function captureAuthenticated(browser) {
  let overflow = 0;

  // Discover a list id and a person id once, at a comfortable width.
  const discoverCtx = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: { width: 390, height: 844 },
  });
  const discoverPage = await discoverCtx.newPage();
  await discoverPage.goto(`${BASE_URL}/app`, { waitUntil: "networkidle" });
  if (new URL(discoverPage.url()).pathname.startsWith("/sign-in")) {
    console.error("  ✗ storageState is not signed in (landed on /sign-in). Regenerate it — see header.");
    await discoverCtx.close();
    return 0;
  }
  const listHref = await discoverPage.getAttribute('a[href^="/app/list/"]', "href").catch(() => null);
  await discoverPage.goto(`${BASE_URL}/app/people`, { waitUntil: "networkidle" });
  const personHref = await discoverPage.getAttribute('a[href^="/app/person/"]', "href").catch(() => null);
  await discoverCtx.close();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      storageState: STORAGE_STATE,
      viewport: { width: vp.w, height: vp.h },
    });
    const page = await context.newPage();

    const shot = async (slug, label = slug) => {
      await page.screenshot({ path: path.join(OUT_DIR, `${slug}-${vp.w}.png`), fullPage: true });
      const o = await horizontalOverflow(page);
      if (o > 1) overflow++;
      console.log(`  ✓ ${label.padEnd(18)} @ ${vp.w}px${o > 1 ? `  ⚠️  H-OVERFLOW +${o}px` : ""}`);
    };
    const goto = (p) => page.goto(`${BASE_URL}${p}`, { waitUntil: "networkidle" });
    const safely = async (fn, what) => {
      try {
        await fn();
      } catch (err) {
        console.log(`  · skipped ${what} @ ${vp.w}px (${err.message.split("\n")[0]})`);
      }
    };

    await safely(async () => {
      await goto("/app");
      await shot("home", "home");
    }, "home");

    if (listHref) {
      await safely(async () => {
        await goto(listHref);
        // capture each view mode by toggling it
        for (const [label, slug] of [["Grid view", "list-grid"], ["List view", "list-compact"], ["Cozy view", "list-cozy"]]) {
          const toggle = page.getByRole("button", { name: label });
          if (await toggle.count()) {
            await toggle.first().click();
            await page.waitForTimeout(350);
          }
          await shot(slug, slug);
        }
      }, "list detail");

      // add-item sheet
      await safely(async () => {
        await goto(listHref);
        await page.getByRole("button", { name: "Add to this list" }).click();
        await page.waitForTimeout(400);
        await shot("sheet-add-item", "add-item sheet");
        await page.keyboard.press("Escape");
      }, "add-item sheet");
    }

    await safely(async () => {
      await goto("/app/people");
      await shot("people", "people");
    }, "people");

    if (personHref) {
      await safely(async () => {
        await goto(personHref);
        await shot("person", "person detail");
      }, "person detail");
    }

    await safely(async () => {
      await goto("/app/profile");
      await shot("profile", "profile");
    }, "profile");

    // create-list sheet (from Home's FAB)
    await safely(async () => {
      await goto("/app");
      await page.getByRole("button", { name: "Start a little list" }).click();
      await page.waitForTimeout(400);
      await shot("sheet-create-list", "create-list sheet");
      await page.keyboard.press("Escape");
    }, "create-list sheet");

    await context.close();
  }

  return overflow;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
