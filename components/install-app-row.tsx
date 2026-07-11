"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { focusRingInset } from "@/lib/a11y";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function subscribeToDisplayMode(onStoreChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function isRunningStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

interface InstallAppValue {
  installed: boolean;
  promptInstall: () => Promise<boolean>;
}

const InstallAppContext = createContext<InstallAppValue | null>(null);

/** Mounted with the app shell so Chromium's one-time install event survives navigation to Profile. */
export function InstallAppProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const standalone = useSyncExternalStore(subscribeToDisplayMode, isRunningStandalone, () => true);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (outcome === "accepted") setInstalled(true);
    return true;
  }, [installPrompt]);

  const value = useMemo(
    () => ({ installed: installed || standalone, promptInstall }),
    [installed, standalone, promptInstall]
  );

  return <InstallAppContext.Provider value={value}>{children}</InstallAppContext.Provider>;
}

export function InstallAppRow() {
  const installApp = useContext(InstallAppContext);
  const [guidance, setGuidance] = useState<"ios" | "browser" | null>(null);

  async function onInstall() {
    if (await installApp?.promptInstall()) return;

    setGuidance(isIosDevice() ? "ios" : "browser");
  }

  if (!installApp || installApp.installed) return null;

  return (
    <>
      <div className="mx-4 h-px bg-line/60" />
      <button
        type="button"
        onClick={() => void onInstall()}
        aria-expanded={guidance !== null}
        aria-controls="install-little-lists-guidance"
        className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold text-ink transition-colors hover:bg-cream-deep active:bg-cream-deep ${focusRingInset}`}
      >
        Add Little Lists to your phone
        <span aria-hidden className="text-brown-soft">{guidance ? "−" : "+"}</span>
      </button>
      {guidance && (
        <div
          id="install-little-lists-guidance"
          role="status"
          className="border-t border-line/60 bg-cream-deep/55 px-4 py-3 text-[0.85rem] font-medium leading-relaxed text-brown"
        >
          {guidance === "ios"
            ? "In Safari, tap the Share button, then choose Add to Home Screen."
            : "Open your browser menu, then choose Install app or Add to Home screen."}
        </div>
      )}
    </>
  );
}
