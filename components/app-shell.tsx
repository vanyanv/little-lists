"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { UiProvider } from "@/lib/ui";
import { useStoreState } from "@/lib/store";
import { BottomNav } from "./bottom-nav";
import { FloatingAddButton } from "./floating-add-button";
import { Toast } from "./toast";
import { SaveErrorToast } from "./save-error-toast";
import { InstallAppProvider } from "./install-app-row";

// Confetti physics (canvas-confetti) is only needed for the rare milestone
// celebration — load it lazily so it stays out of the initial bundle.
const Celebration = dynamic(
  () => import("./celebration").then((m) => m.Celebration),
  { ssr: false }
);

// Modal sheets are only needed once the user opens one — load each lazily
// so they stay out of the initial bundle.
const AddItemModal = dynamic(() => import("./add-item-modal").then((m) => m.AddItemModal), { ssr: false });
const PocketSheet = dynamic(() => import("./pocket-sheet").then((m) => m.PocketSheet), { ssr: false });
const AddDetailSheet = dynamic(() => import("./add-detail-sheet").then((m) => m.AddDetailSheet), { ssr: false });
const CreateListSheet = dynamic(() => import("./create-list-sheet").then((m) => m.CreateListSheet), { ssr: false });
const CreatePersonSheet = dynamic(() => import("./create-person-sheet").then((m) => m.CreatePersonSheet), { ssr: false });
const EditListSheet = dynamic(() => import("./edit-list-sheet").then((m) => m.EditListSheet), { ssr: false });
const EditPersonSheet = dynamic(() => import("./edit-person-sheet").then((m) => m.EditPersonSheet), { ssr: false });
const EditDetailSheet = dynamic(() => import("./edit-detail-sheet").then((m) => m.EditDetailSheet), { ssr: false });
const ConfirmSheet = dynamic(() => import("./confirm-sheet").then((m) => m.ConfirmSheet), { ssr: false });
const MoveItemSheet = dynamic(() => import("./move-item-sheet").then((m) => m.MoveItemSheet), { ssr: false });

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
  const { celebration } = useStoreState();

  return (
    <UiProvider>
      <InstallAppProvider>
        <MotionConfig reducedMotion="user">
          <div className="flex min-h-dvh w-full justify-center bg-cream-deep">
            {/* overflow-x-CLIP, not -hidden: hidden would force overflow-y to compute
                to auto, making this an unintended scroll container that sticky
                descendants (list detail's .detail-strip) bind to instead of the
                document. clip clips identically without creating a scroll container. */}
            <div className="paper-grain relative min-h-dvh w-full max-w-[440px] overflow-x-clip bg-cream shadow-frame">
              <main className="relative z-[1] min-h-dvh pb-36">
                <PageTransition>{children}</PageTransition>
              </main>
              <FloatingAddButton />
              <Toast />
              <SaveErrorToast />
              <BottomNav />
              <AddItemModal />
              <PocketSheet />
              <AddDetailSheet />
              <CreateListSheet />
              <CreatePersonSheet />
              <EditListSheet />
              <EditPersonSheet />
              <EditDetailSheet />
              <ConfirmSheet />
              <MoveItemSheet />
              <Celebration signal={celebration} />
            </div>
          </div>
        </MotionConfig>
      </InstallAppProvider>
    </UiProvider>
  );
}
