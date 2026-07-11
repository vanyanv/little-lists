import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/landing/info-page";

export const metadata: Metadata = {
  title: "Privacy · Little Lists",
  description: "How Little Lists treats your little lists: private by default, never sold.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy"
      intro="The short version: your little lists are yours. Here is how we treat them, in plain language."
    >
      <InfoSection heading="Private by default">
        Every list and note you make is visible only to you. There are no public profiles, no sharing,
        and no social feed. We do not run ads, and nothing you save is ever sold. Everything travels
        encrypted between your device and our servers.
      </InfoSection>
      <InfoSection heading="What we keep, and for how long">
        The little lists you make: their titles, items, notes, and the details you jot about the
        people you love, tied to your account so they are waiting for you next time. We also keep a
        small, content-free log of which features get used (never what is inside your lists) so we
        know what to improve. It is erased when you delete your account. Everything you save
        stays until you delete it, whether that is a single item or your whole account. Account deletion
        is immediate and erases all of it.
      </InfoSection>
      <InfoSection heading="Who helps us run this">
        We rely on a small set of trusted services. Clerk handles sign-in, so we never see your password.
        Neon hosts the database that stores your little world, and our app host keeps the site running.
        When you search for something to add, we send your query to the service that can find it, TMDB
        for movies, Open Library and Google Books for books, and Apple&apos;s iTunes catalog for music. Those
        queries only fetch results to show you. We do not sell or mine them.
      </InfoSection>
      <InfoSection heading="Take it with you">
        Download everything you have saved as a JSON file, or as CSV spreadsheets, anytime, right from
        your profile.
      </InfoSection>
      <InfoSection heading="Leaving">
        You can delete your account from your profile, or through your account portal. Either way, your
        data is wiped.
      </InfoSection>
      <InfoSection heading="Backups">
        Our database provider keeps operational backups for reliability, but once something is deleted,
        it is not recoverable.
      </InfoSection>
      <InfoSection heading="Reaching us">
        Questions about your data? Email{" "}
        <a className="font-semibold text-ink underline underline-offset-4" href="mailto:chris@chrisneddys.com">
          chris@chrisneddys.com
        </a>
        .
      </InfoSection>
    </InfoPage>
  );
}
