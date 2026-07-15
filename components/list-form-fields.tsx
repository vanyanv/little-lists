"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import {
  TEMPLATE_META,
  templateRailOrder,
  type ListTemplate,
  type ThemeColor,
  type ViewMode,
} from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { gentleSpring, softSpring, tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { inputPrimary } from "@/lib/field";
import { ViewToggle } from "./view-toggle";
import { EmojiPicker } from "./emoji-picker";
import { ThemeColorPicker } from "./theme-chip";
import { AnimatedCategoryIcon } from "./icons/animated-category-icon";
import { LittleIcon } from "./icons/little-icon";
import { StickerBadge } from "./icons/sticker-badge";

const EMOJI_CHOICES = ["✨", "🎬", "📚", "🍴", "📍", "🎁", "🌷", "🌼", "🛋️", "🎧", "☕", "🍵", "🌿", "🏞️", "💌", "🪩", "🖊️", "🐾"];

export interface ListFormValue {
  name: string;
  template: ListTemplate;
  emoji: string;
  theme: ThemeColor;
  view: ViewMode;
}

interface ListFormFieldsProps {
  value: ListFormValue;
  onChange: (patch: Partial<ListFormValue>) => void;
  /** when a template is chosen, seed emoji/theme/view unless the user already touched them */
  onChooseTemplate: (t: ListTemplate) => void;
  /** show the "how it lays out" view-mode section; the create sheet applies the template's default view silently */
  showView?: boolean;
  /** tuck emoji + theme behind a "make it yours ✨" disclosure, collapsed by default; the edit sheet leaves this off so nothing changes there */
  personalizeCollapsed?: boolean;
}

export function ListFormFields({
  value,
  onChange,
  onChooseTemplate,
  showView = true,
  personalizeCollapsed = false,
}: ListFormFieldsProps) {
  const { name, template, emoji, theme, view } = value;
  const templateOrder = templateRailOrder(template);

  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const measureRail = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    measureRail();
  }, [measureRail]);

  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const personalizeSpring = reduceMotion ? { duration: 0 } : gentleSpring;
  const personalizeId = useId();

  return (
    <>
      {/* live preview */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--t-bg)" }}>
        <StickerBadge emoji={emoji} size={48} rounded="rounded-xl" />
        <div className="min-w-0">
          <p className="truncate font-display text-[1.05rem] font-semibold text-[var(--t-ink)]">
            {name.trim() || "Your little world"}
          </p>
          <p className="text-[0.8rem] font-semibold text-brown">{TEMPLATE_META[template].label}</p>
        </div>
      </div>

      {/* name */}
      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          name your little world
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Things that give me the ick…"
          className={inputPrimary}
        />
      </label>

      {/* template picker */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a starting point</p>
          <motion.span
            animate={{ opacity: atEnd ? 0 : 1, x: atEnd ? 4 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-[0.75rem] font-bold lowercase tracking-tight text-[var(--t-ink)] opacity-80"
            aria-hidden
          >
            swipe for more →
          </motion.span>
        </div>

        <div className="relative">
          <motion.div
            animate={{ opacity: atStart ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8"
            style={{ background: "linear-gradient(to right, var(--color-paper), transparent)" }}
            aria-hidden
          />
          <motion.div
            animate={{ opacity: atEnd ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-11"
            style={{ background: "linear-gradient(to left, var(--color-paper), transparent)" }}
            aria-hidden
          />

          <div
            ref={railRef}
            onScroll={measureRail}
            className="no-scrollbar -mx-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-2 px-2 pb-2 pt-2"
          >
            {templateOrder.map((t) => {
              const meta = TEMPLATE_META[t];
              const active = t === template;
              return (
                <motion.button
                  key={t}
                  type="button"
                  whileTap={tap}
                  onClick={() => onChooseTemplate(t)}
                  aria-pressed={active}
                  className={`${themeClass(meta.theme)} ${focusRing} relative flex w-[6.25rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition ${
                    active ? "shadow-soft ring-2 ring-[var(--t-edge)]" : "ring-1 ring-[var(--t-edge)]"
                  }`}
                  style={{ background: active ? "var(--t-wash)" : "var(--t-bg)" }}
                >
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={softSpring}
                      className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-ink text-cream shadow-soft"
                      aria-hidden
                    >
                      <LittleIcon name="check" size={10} />
                    </motion.span>
                  )}
                  <span className={`grid h-8 w-8 place-items-center rounded-lg transition ${active ? "bg-paper shadow-soft" : "bg-paper/70"}`}>
                    <AnimatedCategoryIcon id={t} size={18} play={active} />
                  </span>
                  <span className="text-[0.75rem] font-bold leading-tight text-[var(--t-ink)]">{meta.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <p className="mt-2 min-h-[2.5em] text-[0.8rem] leading-snug text-brown-soft">
          {TEMPLATE_META[template].descriptor}
        </p>
      </div>

      {/* emoji + theme, optionally tucked behind a "make it yours" disclosure */}
      {personalizeCollapsed ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setPersonalizeOpen((o) => !o)}
            aria-expanded={personalizeOpen}
            aria-controls={personalizeId}
            className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl ${focusRing}`}
          >
            <span className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">make it yours ✨</span>
            <motion.span
              animate={{ rotate: personalizeOpen ? 0 : -90 }}
              transition={personalizeSpring}
              className="text-brown-soft"
              aria-hidden
            >
              <ChevronDown size={18} strokeWidth={2} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {personalizeOpen && (
              <motion.div
                key="personalize"
                id={personalizeId}
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={personalizeSpring}
                className="overflow-hidden"
              >
                <PersonalizeFields emoji={emoji} theme={theme} onChange={onChange} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <PersonalizeFields emoji={emoji} theme={theme} onChange={onChange} />
      )}

      {/* default view */}
      {showView && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">how it lays out</p>
          <ViewToggle value={view} onChange={(v) => onChange({ view: v })} />
        </div>
      )}
    </>
  );
}

/** the emoji + theme pickers, shared between the inline layout and the collapsible "make it yours" panel */
function PersonalizeFields({
  emoji,
  theme,
  onChange,
}: {
  emoji: string;
  theme: ThemeColor;
  onChange: (patch: Partial<ListFormValue>) => void;
}) {
  return (
    <>
      {/* emoji */}
      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a vibe</p>
        <EmojiPicker choices={EMOJI_CHOICES} value={emoji} onChange={(e) => onChange({ emoji: e })} />
      </div>

      {/* theme */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a color</p>
          <span className="text-[0.75rem] font-bold lowercase tracking-tight text-[var(--t-ink)]">{theme}</span>
        </div>
        <ThemeColorPicker value={theme} onChange={(c) => onChange({ theme: c })} />
      </div>
    </>
  );
}
