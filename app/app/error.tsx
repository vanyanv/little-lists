"use client";

import { Button } from "@/components/button";
import { AnimatedSticker } from "@/components/icons/animated-sticker";

/** Branded boundary for anything that throws inside the app. Renders within the
 *  app shell, so the bottom nav stays put and you can wander elsewhere. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <AnimatedSticker name="tape" size={64} className="mb-2" />
      <h1 className="mt-4 font-display text-[1.5rem] font-semibold leading-tight text-ink">
        Something got a little tangled
      </h1>
      <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-brown">
        A small hiccup on our end. Your little worlds are safe. Let&apos;s try that again.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <Button href="/app" size="sm" variant="soft">
          Back to your lists
        </Button>
      </div>
    </div>
  );
}
