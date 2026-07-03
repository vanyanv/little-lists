"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { tap } from "@/lib/motion";
import { focusRing, focusRingOnDark } from "@/lib/a11y";

/**
 * The one primary-action button for the app. Every ink pill, danger confirm,
 * and soft secondary routes through here so sizing, focus rings, and the
 * tactile press stay identical everywhere. Renders a <button> by default, or an
 * animated Next <Link> when given `href`.
 */
type ButtonVariant = "primary" | "danger" | "soft" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const SIZE: Record<ButtonSize, string> = {
  sm: "px-5 py-3 text-[0.92rem]",
  md: "px-6 py-3.5 text-[0.95rem]",
  lg: "px-6 py-4 text-[1rem]",
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: `bg-ink text-cream shadow-lift transition-colors hover:bg-ink-soft ${focusRingOnDark}`,
  danger: `bg-rosewood text-cream shadow-lift ${focusRingOnDark}`,
  soft: `bg-paper text-brown ring-1 ring-line shadow-soft transition-colors hover:bg-cream-deep ${focusRing}`,
  ghost: `text-brown-soft transition-colors hover:bg-cream-deep ${focusRing}`,
};

function buttonClass(variant: ButtonVariant, size: ButtonSize, block: boolean, className: string) {
  return [
    "inline-flex items-center justify-center rounded-pill font-bold leading-none",
    "disabled:opacity-40 disabled:pointer-events-none",
    SIZE[size],
    VARIANT[variant],
    block ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  children: ReactNode;
}

const MotionLink = motion.create(Link);

type ButtonAsButton = CommonProps & { href?: undefined } & Omit<
    HTMLMotionProps<"button">,
    keyof CommonProps | "href"
  >;
type ButtonAsLink = CommonProps & { href: string } & Omit<
    ComponentProps<typeof MotionLink>,
    keyof CommonProps
  >;

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", block = false, className = "", children, ...rest } = props;
  const cls = buttonClass(variant, size, block, className);

  if (props.href !== undefined) {
    return (
      <MotionLink whileTap={tap} className={cls} {...(rest as ComponentProps<typeof MotionLink>)}>
        {children}
      </MotionLink>
    );
  }

  return (
    <motion.button type="button" whileTap={tap} className={cls} {...(rest as HTMLMotionProps<"button">)}>
      {children}
    </motion.button>
  );
}
