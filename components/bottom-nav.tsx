"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";
import { focusRingInset } from "@/lib/a11y";
import { useUi } from "@/lib/ui";
import { useStore } from "@/lib/store";

type IconProps = { active: boolean };

function ListsIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="6" rx="2.4" stroke="currentColor" strokeWidth="1.8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />
      <rect x="3.5" y="13.5" width="17" height="6" rx="2.4" stroke="currentColor" strokeWidth="1.8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />
      <circle cx="7" cy="7.5" r="1.1" fill="currentColor" />
      <circle cx="7" cy="16.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
function PeopleIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />
      <path d="M3.5 19c0-3 2.6-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16.6" cy="7.6" r="2.4" stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
      <path d="M15 13.4c2.6-.4 5 1.3 5.4 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
function ProfileIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8.4" r="3.6" stroke="currentColor" strokeWidth="1.8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />
      <path d="M5 19.2c.4-3.6 3.3-6 7-6s6.6 2.4 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function PocketIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 6.5c2.4-1.3 12.6-1.3 15 0v8.9a3.6 3.6 0 0 1-3.6 3.6H8.1a3.6 3.6 0 0 1-3.6-3.6V6.5Z"
        stroke="currentColor" strokeWidth="1.8"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0}
      />
      <path d="M4.5 6.8C6.1 9.5 9 11 12 11s5.9-1.5 7.5-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: "/app", label: "Lists", Icon: ListsIcon, match: (p: string) => p === "/app" || p.startsWith("/app/list/") },
  { href: "/app/people", label: "People", Icon: PeopleIcon, match: (p: string) => p.startsWith("/app/people") || p.startsWith("/app/person") },
  { href: "/app/profile", label: "Profile", Icon: ProfileIcon, match: (p: string) => p.startsWith("/app/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { sheet, openPocketSheet } = useUi();
  const { scraps } = useStore();
  const pocketOpen = sheet?.kind === "pocket";

  const renderTab = ({ href, label, Icon, match }: (typeof TABS)[number]) => {
    const active = match(pathname);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 ${focusRingInset}`}
        style={{ color: active ? "var(--color-ink)" : "var(--color-brown-soft)" }}
      >
        {active && (
          <motion.span
            layoutId="nav-pill"
            transition={reduce ? { duration: 0 } : softSpring}
            className="absolute inset-0 rounded-xl bg-cream-deep"
          />
        )}
        <span className="relative">
          <Icon active={active} />
        </span>
        <span className="relative text-[0.75rem] font-bold tracking-wide">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
      <div className="pointer-events-auto mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex w-full max-w-[440px] items-stretch justify-around rounded-2xl border border-line/70 bg-paper/85 px-2 py-1.5 shadow-lift backdrop-blur-md">
        {renderTab(TABS[0])}
        <button
          type="button"
          onClick={openPocketSheet}
          aria-label={scraps.length > 0 ? `Pocket, ${scraps.length} waiting` : "Pocket"}
          className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 ${focusRingInset} ${pocketOpen ? "bg-cream-deep" : ""}`}
          style={{ color: pocketOpen ? "var(--color-ink)" : "var(--color-brown-soft)" }}
        >
          <span className="relative">
            <PocketIcon active={pocketOpen} />
            {scraps.length > 0 && (
              <span
                aria-hidden
                className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-pill bg-ink px-1 text-[0.62rem] font-bold leading-4 text-cream"
              >
                {scraps.length > 9 ? "9+" : scraps.length}
              </span>
            )}
          </span>
          <span className="relative text-[0.75rem] font-bold tracking-wide">Pocket</span>
        </button>
        {TABS.slice(1).map(renderTab)}
      </div>
    </nav>
  );
}
