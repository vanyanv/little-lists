import type { Metadata } from "next";
import { getLandingLists } from "@/lib/landing-art";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { PeopleMemory } from "@/components/landing/people-memory";
import { PocketCapture } from "@/components/landing/pocket-capture";
import { UseCases } from "@/components/landing/use-cases";
import { Privacy } from "@/components/landing/privacy";
import { LandingFaq } from "@/components/landing/landing-faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Little Lists · remember what you love and what they love",
  description:
    "Keep movies, books, places, gift ideas, plans, and the little details about your favorite people together in one cozy, private place.",
};

// refresh the preview's real poster/cover art daily
export const revalidate = 86400;

export default async function LandingPage() {
  const { movies, books, showcaseMovies, showcaseBooks } = await getLandingLists();
  return (
    <>
      <LandingHeader />
      <main className="paper-grain relative min-h-dvh overflow-x-hidden bg-cream">
        <LandingHero movies={movies} books={books} />
        <PeopleMemory />
        <PocketCapture />
        <UseCases movies={showcaseMovies} books={showcaseBooks} />
        <Privacy />
        <LandingFaq />
        <FinalCta />
        <LandingFooter />
      </main>
    </>
  );
}
