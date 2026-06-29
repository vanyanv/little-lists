import type { ReactNode } from "react";
import { ListsProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { ensureProfileForClerkUser } from "@/lib/server/profile";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // First protected-route access for a signed-in user creates their Profile.
  // Idempotent; localStorage UI below is unchanged.
  await ensureProfileForClerkUser();

  return (
    <ListsProvider>
      <AppShell>{children}</AppShell>
    </ListsProvider>
  );
}
