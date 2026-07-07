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
        Every list and note you make is visible only to you. Nothing you save is public unless you
        choose to create a share link for it.
      </InfoSection>
      <InfoSection heading="Signing in">
        We use Clerk to handle sign-in securely, so your account stays protected. We never see your
        password.
      </InfoSection>
      <InfoSection heading="What we keep">
        Just the little lists you make: their titles, items, notes, and the details you jot about the
        people you love, tied to your account so they are waiting for you next time.
      </InfoSection>
      <InfoSection heading="We do not sell your stuff">
        Your lists are not for sale and not used for ads. They are a personal archive, not a product.
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
