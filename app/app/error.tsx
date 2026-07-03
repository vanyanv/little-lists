"use client";

import { Button } from "@/components/button";

/** Branded boundary for anything that throws inside the app. Renders within the
 *  app shell, so the bottom nav stays put and you can wander elsewhere. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <p className="font-display text-[3.5rem] leading-none" aria-hidden>
        🌧️
      </p>
      <h1 className="mt-4 font-display text-[1.5rem] font-semibold leading-tight text-ink">
        Something got a little tangled
      </h1>
      <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-brown">
        A small hiccup on our end. Your little worlds are safe. Let&apos;s try that again.
      </p>
      <Button size="sm" onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
