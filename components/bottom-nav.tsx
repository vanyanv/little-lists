"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { CircleUser, LayoutList, Paperclip, Users } from "lucide-react";
import { softSpring } from "@/lib/motion";
import { focusRingInset } from "@/lib/a11y";
import { useUi } from "@/lib/ui";
import { useStore } from "@/lib/store";

type IconProps = { active: boolean };

function ListsIcon({ active }: IconProps) {
  return <LayoutList size={24} strokeWidth={1.8} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />;
}
function PeopleIcon({ active }: IconProps) {
  return <Users size={24} strokeWidth={1.8} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />;
}
function ProfileIcon({ active }: IconProps) {
  return <CircleUser size={24} strokeWidth={1.8} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />;
}
function PocketIcon({ active }: IconProps) {
  return <Paperclip size={24} strokeWidth={1.8} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0} />;
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
