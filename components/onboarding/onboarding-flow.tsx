"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/button";
import { AnimatedSticker } from "@/components/icons/animated-sticker";
import { CategoryIcon } from "@/components/icons/category-icon";
import { SaveSparkle } from "@/components/icons/save-sparkle";
import { completeOnboardingAction, skipOnboardingAction } from "@/lib/actions";
import {
  MAX_STARTERS,
  MIN_STARTERS,
  ONBOARDING_TOAST_KEY,
  PERSON_STARTER,
  STARTER_OPTIONS,
} from "@/lib/onboarding";
import { popItem, softSpring, staggerContainer, tap } from "@/lib/motion";
import { TEMPLATE_META } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { focusRing } from "@/lib/a11y";

type Step = "welcome" | "pick" | "ready";

const stepFade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: "easeIn" as const } },
};

export function OnboardingFlow() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("welcome");
  const [picked, setPicked] = useState<string[]>([]);
  const [includePerson, setIncludePerson] = useState(false);
  const [seedExamples, setSeedExamples] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  // bumps when a fifth pick is attempted, wiggling the "plenty to start" hint
  const [maxNudge, setMaxNudge] = useState(0);

  const count = picked.length + (includePerson ? 1 : 0);

  function toggleStarter(id: string) {
    const isPerson = id === PERSON_STARTER.id;
    const isOn = isPerson ? includePerson : picked.includes(id);
    if (!isOn && count >= MAX_STARTERS) {
      setMaxNudge((n) => n + 1);
      return;
    }
    if (isPerson) setIncludePerson((v) => !v);
    else setPicked((prev) => (isOn ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function submit() {
    setPending(true);
    setError(false);
    try {
      await completeOnboardingAction({ starters: picked, includePerson, seedExamples });
      setStep("ready");
    } catch (err) {
      console.error("completeOnboardingAction failed", err);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function skip() {
    setPending(true);
    setError(false);
    try {
      await skipOnboardingAction();
      window.location.assign("/app");
    } catch (err) {
      console.error("skipOnboardingAction failed", err);
      setError(true);
      setPending(false);
    }
  }

  function finish() {
    try {
      sessionStorage.setItem(ONBOARDING_TOAST_KEY, "1");
    } catch {
      // storage unavailable — the toast is a nicety, keep going
    }
    window.location.assign("/app");
  }

  const skipButton = (
    <Button variant="ghost" size="sm" disabled={pending} onClick={skip}>
      Skip for now
    </Button>
  );

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.section
            key="welcome"
            variants={stepFade}
            initial={reduce ? false : "hidden"}
            animate="show"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <FloatingSticker />
            <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-ink">
              Welcome to your little world ✨
            </h1>
            <p className="mt-3 max-w-[19rem] text-[0.98rem] leading-relaxed text-brown">
              Little Lists is a cute place for everything you love, hate, want to try, and want
              to remember.
            </p>
            <p className="mt-4 max-w-[18rem] text-[0.85rem] leading-relaxed text-brown-soft">
              Everything here is private by default — this little world is just yours 🌙
            </p>
            <div className="mt-8 flex w-full max-w-[17rem] flex-col items-center gap-2">
              <Button size="lg" block onClick={() => setStep("pick")}>
                Let&apos;s set it up
              </Button>
              {skipButton}
            </div>
          </motion.section>
        )}

        {step === "pick" && (
          <motion.section
            key="pick"
            variants={stepFade}
            initial={reduce ? false : "hidden"}
            animate="show"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <h1 className="font-display text-[1.6rem] font-semibold leading-tight text-ink">
              What do you want to keep track of?
            </h1>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-brown">
              Pick a few little lists to start with — two to four feels just right.
            </p>

            <motion.div
              variants={staggerContainer}
              initial={reduce ? false : "hidden"}
              animate="show"
              className="mt-6 grid grid-cols-2 gap-3"
            >
              {STARTER_OPTIONS.map((opt) => (
                <StarterCard
                  key={opt.id}
                  id={opt.id}
                  title={opt.title}
                  theme={themeClass(TEMPLATE_META[opt.template].theme)}
                  selected={picked.includes(opt.id)}
                  onToggle={() => toggleStarter(opt.id)}
                />
              ))}
              <StarterCard
                id={PERSON_STARTER.id}
                title={PERSON_STARTER.title}
                theme={themeClass("butter")}
                selected={includePerson}
                onToggle={() => toggleStarter(PERSON_STARTER.id)}
              />
            </motion.div>

            <motion.p
              key={maxNudge}
              animate={maxNudge && !reduce ? { x: [0, -5, 5, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="mt-3 min-h-5 text-center text-[0.82rem] text-brown-soft"
              aria-live="polite"
            >
              {count >= MAX_STARTERS
                ? "Four little worlds is plenty to start 🌱"
                : count < MIN_STARTERS
                  ? `Pick at least ${MIN_STARTERS} to begin`
                  : ""}
            </motion.p>

            <ExamplesToggle on={seedExamples} onToggle={() => setSeedExamples((v) => !v)} />

            {error && (
              <p className="mt-3 text-center text-[0.85rem] text-rosewood" role="alert">
                Something went sideways — mind trying again?
              </p>
            )}

            <div className="mt-5 flex flex-col items-center gap-2">
              <Button size="lg" block disabled={pending || count < MIN_STARTERS} onClick={submit}>
                {pending ? "Making it cozy…" : "Make my lists"}
              </Button>
              {skipButton}
            </div>
          </motion.section>
        )}

        {step === "ready" && (
          <motion.section
            key="ready"
            variants={stepFade}
            initial={reduce ? false : "hidden"}
            animate="show"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <div className="relative">
              <FloatingSticker />
              <SaveSparkle />
            </div>
            <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-ink">
              Your little worlds are ready ✨
            </h1>
            <p className="mt-3 max-w-[19rem] text-[0.98rem] leading-relaxed text-brown">
              Everything&apos;s tucked into place. Add little things whenever a thought strikes.
            </p>
            <div className="mt-8 w-full max-w-[17rem]">
              <Button size="lg" block onClick={finish}>
                Take me to my little worlds 🌷
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingSticker() {
  return <AnimatedSticker name="sparkle" size={56} twinkles={false} className="mb-6" />;
}

function StarterCard({
  id,
  title,
  theme,
  selected,
  onToggle,
}: {
  id: string;
  title: string;
  theme: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      variants={popItem}
      whileTap={tap}
      animate={{ scale: selected ? 1.03 : 1 }}
      transition={softSpring}
      onClick={onToggle}
      aria-pressed={selected}
      className={`${theme} flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl p-4 text-left shadow-soft ${focusRing} ${
        selected ? "bg-[var(--t-bg)] ring-2 ring-[var(--t-edge)]" : "bg-paper ring-1 ring-line"
      }`}
    >
      <CategoryIcon id={id} size={22} />
      <span className={`text-[0.88rem] font-bold leading-snug ${selected ? "text-[var(--t-ink)]" : "text-ink"}`}>
        {title}
      </span>
    </motion.button>
  );
}

function ExamplesToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3.5 text-left ring-1 ring-line shadow-soft ${focusRing}`}
    >
      <span className="text-[0.88rem] leading-snug text-brown">
        Add a few example ideas so it doesn&apos;t feel empty
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors ${on ? "bg-ink" : "bg-cream-deep ring-1 ring-line"}`}
      >
        <motion.span
          layout
          transition={softSpring}
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow-soft ${on ? "right-0.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
