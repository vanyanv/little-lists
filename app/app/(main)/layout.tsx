import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ListsProvider, type StoreSeed } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { ensureProfileForClerkUser } from "@/lib/server/profile";
import { getInitialData } from "@/lib/server/data";
import type { Profile } from "@/lib/types";

// Every screen here depends on the signed-in user (Clerk reads headers), so the
// whole segment is rendered per-request rather than prerendered at build time.
export const dynamic = "force-dynamic";

// Shown only if the DB is briefly unreachable and no profile row resolves yet;
// the app stays usable and a reload picks up the real profile.
const FALLBACK_PROFILE: Profile = {
  name: "Vardan",
  handle: "@vardan",
  avatarEmoji: "🌙",
  bio: "movies I keep meaning to watch, food opinions, and tiny details I don't want to forget.",
  theme: "blush",
  tags: [],
  featuredListIds: [],
  isPublic: false,
  demoSeeded: false,
  // don't flash the first-steps checklist while the real profile is unknown
  checklistDismissed: true,
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  // First protected-route access for a signed-in user creates their Profile.
  // Idempotent; guarded so a transient DB outage degrades to "profile not yet
  // created" (retried next request) rather than taking down the app — on
  // outage needsOnboarding stays false: degrade into the app, never trap.
  let needsOnboarding = false;
  try {
    const profileRow = await ensureProfileForClerkUser();
    needsOnboarding = !!profileRow && !profileRow.onboardingCompleted;
  } catch (err) {
    console.error("ensureProfileForClerkUser failed; will retry next request", err);
  }

  // redirect() throws NEXT_REDIRECT, so it must sit outside the try/catch.
  // Onboarding is outside this (main) route group, so no redirect loop.
  if (needsOnboarding) redirect("/app/onboarding");

  let seed: StoreSeed = { lists: [], people: [], profile: FALLBACK_PROFILE };
  try {
    const data = await getInitialData();
    seed = {
      lists: data.lists,
      people: data.people,
      profile: data.profile ?? FALLBACK_PROFILE,
    };
  } catch (err) {
    console.error("getInitialData failed; seeding an empty little world", err);
  }

  return (
    <ListsProvider seed={seed}>
      <AppShell>{children}</AppShell>
    </ListsProvider>
  );
}
