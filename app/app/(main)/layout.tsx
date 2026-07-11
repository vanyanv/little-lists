import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ListsProvider, type StoreSeed } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { AnalyticsBoot } from "@/components/analytics-boot";
import { ensureProfileForClerkUser } from "@/lib/server/profile";
import { getInitialData } from "@/lib/server/data";
import type { Profile } from "@/lib/types";
import type { Profile as ProfileRow } from "@prisma/client";

// Every screen here depends on the signed-in user (Clerk reads headers), so the
// whole segment is rendered per-request rather than prerendered at build time.
export const dynamic = "force-dynamic";

// Shown only if a resolved user has no profile row yet mid-request; neutral so
// it never leaks a real-looking identity. A reload picks up the real profile.
const FALLBACK_PROFILE: Profile = {
  name: "friend",
  avatarEmoji: "🌙",
  theme: "blush",
  demoSeeded: false,
  // don't flash the first-steps checklist while the real profile is unknown
  checklistDismissed: true,
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  // First protected-route access for a signed-in user creates their Profile.
  // Idempotent; guarded so a transient DB outage degrades rather than taking
  // down the app.
  let hasProfile = false;
  let onboardingCompleted = false;
  let profileRow: ProfileRow | null = null;
  try {
    profileRow = await ensureProfileForClerkUser();
    hasProfile = !!profileRow;
    onboardingCompleted = !!profileRow?.onboardingCompleted;
  } catch (err) {
    console.error("ensureProfileForClerkUser failed; will retry next request", err);
  }

  // redirect() throws NEXT_REDIRECT, so it must sit outside the try/catch.
  // Onboarding is outside this (main) route group, so no redirect loop. A fresh
  // signup with no row yet (or an ensure that failed) lands in onboarding rather
  // than home wearing a placeholder identity.
  if (!hasProfile || !onboardingCompleted) redirect("/app/onboarding");

  // A failed load must NOT render as an empty little world: a user with real
  // data would see a false fresh-start, the most trust-breaking screen this
  // app can show. Throwing reaches app/app/error.tsx, which promises their
  // little worlds are safe and offers a retry.
  const data = await getInitialData({ profile: profileRow ?? undefined });
  const seed: StoreSeed = {
    lists: data.lists,
    people: data.people,
    scraps: data.scraps,
    profile: data.profile ?? FALLBACK_PROFILE,
  };

  return (
    <ListsProvider seed={seed}>
      <AnalyticsBoot />
      <AppShell>{children}</AppShell>
    </ListsProvider>
  );
}
