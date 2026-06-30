"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";
import { focusRingInset } from "@/lib/a11y";

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

const TABS = [
  { href: "/", label: "Lists", Icon: ListsIcon, match: (p: string) => p === "/" || p.startsWith("/list") },
  { href: "/people", label: "People", Icon: PeopleIcon, match: (p: string) => p.startsWith("/people") || p.startsWith("/person") },
  { href: "/profile", label: "Profile", Icon: ProfileIcon, match: (p: string) => p.startsWith("/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
      <div className="pointer-events-auto mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex w-full max-w-[420px] items-stretch justify-around rounded-2xl border border-line/70 bg-paper/85 px-2 py-1.5 shadow-lift backdrop-blur-md">
        {TABS.map(({ href, label, Icon, match }) => {
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
              <span className="relative text-[0.68rem] font-bold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
