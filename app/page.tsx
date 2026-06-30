import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { UseCases } from "@/components/landing/use-cases";
import { ViewModes } from "@/components/landing/view-modes";
import { PeopleMemory } from "@/components/landing/people-memory";
import { Privacy } from "@/components/landing/privacy";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Little Lists — cozy little lists for everything you love",
  description:
    "Make little lists for everything you love, hate, and want to remember. Movies to watch, books to read, foods you avoid, gift ideas, date ideas, and tiny details about people, all in one cozy place.",
};

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main className="paper-grain relative min-h-dvh overflow-x-hidden bg-cream">
        <LandingHero />
        <UseCases />
        <ViewModes />
        <PeopleMemory />
        <Privacy />
        <FinalCta />
        <LandingFooter />
      </main>
    </>
  );
}
