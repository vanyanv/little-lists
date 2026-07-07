import Link from "next/link";
import { Sticker } from "@/components/sticker";
import { focusRing, focusRingOnDark } from "@/lib/a11y";

/* Minimal sticky top bar so a returning visitor always has a way back in.
   Light and on-brand, not a heavy SaaS nav. Lives outside the landing's
   overflow-x-hidden <main> so position:sticky isn't clipped. */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/40 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link
          href="/"
          aria-label="Little Lists home"
          className={`inline-flex items-center gap-2 rounded-pill px-1 py-0.5 ${focusRing}`}
        >
          <Sticker name="flower" size={22} />
          <span className="font-display text-[1.12rem] font-semibold text-ink">Little Lists</span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <Link
            href="/sign-in"
            className={`rounded-pill px-4 py-2 text-[0.9rem] font-bold text-brown transition-colors hover:bg-cream-deep ${focusRing}`}
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className={`rounded-pill bg-ink px-4 py-2 text-[0.9rem] font-bold text-cream shadow-soft transition-colors hover:bg-ink-soft ${focusRingOnDark}`}
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
