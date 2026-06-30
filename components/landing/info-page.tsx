import type { ReactNode } from "react";
import Link from "next/link";
import { focusRing } from "@/lib/a11y";
import { LandingHeader } from "./landing-header";
import { LandingFooter } from "./landing-footer";

/* Shared cozy shell for the plain-language Privacy / Terms pages, so they
   wear the same header, footer, and reading column as the landing. */
export function InfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <LandingHeader />
      <main className="paper-grain relative min-h-dvh bg-cream">
        <article className="relative z-[1] mx-auto max-w-2xl px-5 py-12">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 rounded text-[0.9rem] font-semibold text-brown transition-colors hover:text-ink ${focusRing}`}
          >
            <span aria-hidden>←</span> Back to home
          </Link>
          <h1 className="mt-6 font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.9rem, 6vw, 2.6rem)" }}>
            {title}
          </h1>
          <p className="mt-3 text-[1.02rem] leading-relaxed text-brown">{intro}</p>
          <div className="mt-8 flex flex-col gap-6">{children}</div>
        </article>
        <LandingFooter />
      </main>
    </>
  );
}

export function InfoSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[1.2rem] font-semibold text-ink">{heading}</h2>
      <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-soft">{children}</p>
    </section>
  );
}
