import Link from "next/link";
import { Sticker } from "@/components/sticker";
import { focusRing } from "@/lib/a11y";

const LINK = `rounded text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline ${focusRing}`;

/* A real footer: wordmark, the trust links the page's privacy promise implies,
   and a way to reach a human. */
export function LandingFooter() {
  return (
    <footer className="relative z-[1] mt-4 border-t border-line/50 px-5 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <div>
          <span className="inline-flex items-center gap-2">
            <Sticker name="flower" size={20} />
            <span className="font-display text-[1.05rem] font-semibold text-ink">Little Lists</span>
          </span>
          <p className="mt-2 text-[0.9rem] text-brown">A tiny archive of your taste, plans, and people.</p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.9rem] font-semibold">
          <Link href="/privacy" className={LINK}>Privacy</Link>
          <Link href="/terms" className={LINK}>Terms</Link>
          <a href="mailto:chris@chrisneddys.com" className={LINK}>Contact</a>
        </nav>

        <p className="text-[0.8rem] text-brown">Made with care, 2026. 🌸</p>
      </div>
    </footer>
  );
}
