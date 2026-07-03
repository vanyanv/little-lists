import { Button } from "@/components/button";

export default function NotFound() {
  return (
    <main className="paper-grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-cream px-8 text-center">
      <p className="font-display text-[3.5rem] leading-none" aria-hidden>
        🍃
      </p>
      <h1 className="mt-4 font-display text-[1.6rem] font-semibold leading-tight text-ink">
        This little corner wandered off
      </h1>
      <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-brown">
        The page you&apos;re looking for isn&apos;t here, but your little worlds still are.
      </p>
      <Button href="/" size="sm" className="mt-6">
        Back to the start
      </Button>
    </main>
  );
}
