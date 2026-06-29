import type { ReactNode } from "react";
import { ListsProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ListsProvider>
      <AppShell>{children}</AppShell>
    </ListsProvider>
  );
}
