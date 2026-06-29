import type { ReactNode } from "react";
import { ListsProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { ensureProfileForClerkUser } from "@/lib/server/profile";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // First protected-route access for a signed-in user creates their Profile.
  // Idempotent; localStorage UI below is unchanged. Guarded so a transient DB
  // outage degrades to "profile not yet created" (retried next request) rather
  // than taking down the still-localStorage-backed app.
  try {
    await ensureProfileForClerkUser();
  } catch (err) {
    console.error("ensureProfileForClerkUser failed; will retry next request", err);
  }

  return (
    <ListsProvider>
      <AppShell>{children}</AppShell>
    </ListsProvider>
  );
}
