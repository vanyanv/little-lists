import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/landing/info-page";

export const metadata: Metadata = {
  title: "Terms — Little Lists",
  description: "The basics of using Little Lists, in plain language.",
};

export default function TermsPage() {
  return (
    <InfoPage
      title="The basics"
      intro="The terms of using Little Lists, in plain language. Nothing buried in the fine print."
    >
      <InfoSection heading="Free to start">
        You can make your little world without paying anything.
      </InfoSection>
      <InfoSection heading="Your content is yours">
        The lists, notes, and details you add belong to you. We just keep them safe and show them back
        to you whenever you return.
      </InfoSection>
      <InfoSection heading="Use it kindly">
        Little Lists is for keeping track of the things and people you care about. Please do not use it
        to store anything harmful or to break the law.
      </InfoSection>
      <InfoSection heading="Offered as-is">
        We work to keep things running smoothly, but the app is offered as-is, without guarantees, and
        we may keep improving it over time.
      </InfoSection>
      <InfoSection heading="Reaching us">
        Anything you want to ask? Email{" "}
        <a className="font-semibold text-ink underline underline-offset-4" href="mailto:chris@chrisneddys.com">
          chris@chrisneddys.com
        </a>
        .
      </InfoSection>
    </InfoPage>
  );
}
