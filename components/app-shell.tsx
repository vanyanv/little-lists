"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { UiProvider } from "@/lib/ui";
import { useStore } from "@/lib/store";
import { BottomNav } from "./bottom-nav";
import { FloatingAddButton } from "./floating-add-button";
import { AddItemModal } from "./add-item-modal";
import { AddDetailSheet } from "./add-detail-sheet";
import { CreateListSheet } from "./create-list-sheet";
import { CreatePersonSheet } from "./create-person-sheet";
import { EditListSheet } from "./edit-list-sheet";
import { EditPersonSheet } from "./edit-person-sheet";
import { EditDetailSheet } from "./edit-detail-sheet";
import { ConfirmSheet } from "./confirm-sheet";
import { Celebration } from "./celebration";
import { Toast } from "./toast";

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { celebration } = useStore();

  return (
    <UiProvider>
      <div className="flex min-h-dvh w-full justify-center bg-cream-deep">
        <div className="paper-grain relative min-h-dvh w-full max-w-[440px] overflow-x-hidden bg-cream shadow-frame">
          <main className="relative z-[1] min-h-dvh pb-36">
            <PageTransition>{children}</PageTransition>
          </main>
          <FloatingAddButton />
          <Toast />
          <BottomNav />
          <AddItemModal />
          <AddDetailSheet />
          <CreateListSheet />
          <CreatePersonSheet />
          <EditListSheet />
          <EditPersonSheet />
          <EditDetailSheet />
          <ConfirmSheet />
          <Celebration signal={celebration} />
        </div>
      </div>
    </UiProvider>
  );
}
