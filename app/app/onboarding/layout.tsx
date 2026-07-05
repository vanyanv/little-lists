import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/server/profile";

// Depends on the signed-in user's profile flag, so render per-request.
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  // Reverse gate: once onboarding is done this route bounces back to the app,
  // the mirror of the forward gate in the (main) layout — they can never both
  // fire, so no loop. On a DB hiccup (null profile) we let onboarding render;
  // completing it again is harmless (the action's claim guard skips seeding).
  const profile = await getCurrentUserProfile();
  if (profile?.onboardingCompleted) redirect("/app");

  // The same cozy phone frame as AppShell, minus nav, FAB, and sheets —
  // onboarding should feel like the app but keep the room quiet.
  return (
    <div className="flex min-h-dvh w-full justify-center bg-cream-deep">
      <div className="paper-grain relative min-h-dvh w-full max-w-[440px] overflow-x-hidden bg-cream shadow-[0_0_70px_oklch(0.5_0.05_60_/_0.14)]">
        <main className="relative z-[1] min-h-dvh">{children}</main>
      </div>
    </div>
  );
}
