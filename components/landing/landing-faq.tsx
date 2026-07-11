import { focusRing } from "@/lib/a11y";
import { LittleIcon } from "@/components/icons/little-icon";

const FAQS = [
  {
    question: "Is everything private?",
    answer: "Yes. Your lists and people notes are visible only to you. Little Lists has no public profile, social feed, or advertising.",
  },
  {
    question: "Is Little Lists free?",
    answer: "Little Lists is free to start. You can make your first little world without entering payment details.",
  },
  {
    question: "Can I use it on my phone and computer?",
    answer: "Yes. Little Lists works in the browser, and your saved world follows your account when you sign in.",
  },
  {
    question: "What can I keep in it?",
    answer: "Movies, books, music, food, places, gift ideas, date ideas, people notes, and custom lists for anything completely yours.",
  },
] as const;

export function LandingFaq() {
  return (
    <section className="px-5 py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[0.78fr_1.22fr] md:gap-16">
        <div>
          <LittleIcon name="flower" variant="sticker" size={34} rotate={-7} />
          <h2 className="mt-4 font-display text-[1.8rem] font-semibold leading-tight text-ink sm:text-[2.2rem]">
            Made for the notes that deserve better than being forgotten
          </h2>
          <p className="mt-3 text-[0.98rem] leading-relaxed text-brown">
            Little Lists keeps meaningful details close without turning your life into a spreadsheet.
            If you have a question, you can always email Chris from the footer.
          </p>
        </div>

        <div className="border-y border-line/70">
          {FAQS.map((item) => (
            <details key={item.question} className="group border-b border-line/70 last:border-b-0">
              <summary
                className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-left font-display text-[1.08rem] font-semibold text-ink marker:content-none ${focusRing}`}
              >
                {item.question}
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cream-deep font-body text-[1rem] text-brown transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="max-w-[42rem] pb-5 pr-10 text-[0.94rem] leading-relaxed text-brown">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
