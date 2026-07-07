import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

// Clerk v7 has no stable top-level `Appearance` export (the old `@clerk/types`
// path isn't installed), so derive the type from ClerkProvider's own
// `appearance` prop. `import type` is erased at build, so no runtime coupling.
type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/* One Little Lists skin for every Clerk surface. Warm cream card, ink text,
   soft-brown accents, pill buttons, soft rounded inputs — no harsh blue/black.
   NOTE: these are Clerk v7 variable names (colorForeground / colorMutedForeground
   / colorInput / colorInputForeground), NOT the older colorText/colorInputBackground. */
export const clerkAppearance: Appearance = {
  variables: {
    // Clerk's `variables` slot only accepts literal color strings (hex/rgb/hsl),
    // not CSS custom properties, so these hex values are hand-copied from the
    // OKLCH tokens in app/globals.css and must be kept in sync by hand if a
    // token there changes. Each comment names the closest globals.css token
    // (converted OKLCH -> sRGB for comparison):
    colorPrimary: "#8A6F61", // ~= --color-brown-soft (#816D60 converted) — accents, links, focus
    colorPrimaryForeground: "#FFF8EF", // = --color-cream (#FCF6ED converted) — text on a primary-colored surface
    colorForeground: "#2B2523", // = --color-ink (#2F2722 converted) — default text
    colorMutedForeground: "#8A6F61", // ~= --color-brown-soft (#816D60 converted) — secondary/muted text
    colorBackground: "#FFF8EF", // = --color-cream (#FCF6ED converted) — page/card background
    colorInput: "#FFFDF9", // ~= --color-paper (#FFFCF8 converted) — matches the same literal used inline for formFieldInput's bg-[#FFFDF9] below
    colorInputForeground: "#2B2523", // = --color-ink (#2F2722 converted) — input text
    colorDanger: "#C56A6A", // no globals.css token — matches the literal used inline for formFieldErrorText's text-[#C56A6A] below; a softer, less alarming red than --color-rosewood (#B04D54 converted)
    borderRadius: "0.9rem",
    fontFamily: "var(--font-nunito), ui-rounded, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-nunito), ui-rounded, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "rounded-[28px] bg-paper shadow-lift ring-1 ring-line/60 px-7 py-8",
    headerTitle: "font-display text-ink",
    headerSubtitle: "text-brown",
    socialButtonsBlockButton:
      "rounded-pill border border-line bg-paper text-ink hover:bg-cream-deep transition-colors",
    socialButtonsBlockButtonText: "font-semibold text-ink",
    dividerLine: "bg-line",
    dividerText: "text-brown-soft",
    formFieldLabel: "text-ink font-semibold",
    formFieldInput:
      "rounded-2xl border border-line bg-[#FFFDF9] text-ink placeholder:text-brown-soft focus:border-brown-soft focus:ring-2 focus:ring-blush/50",
    formButtonPrimary:
      "rounded-pill bg-ink text-cream font-bold normal-case hover:bg-ink-soft shadow-soft",
    footerActionText: "text-brown",
    footerActionLink: "text-brown font-bold hover:text-ink",
    formFieldErrorText: "text-[#C56A6A]",
    alert: "rounded-2xl bg-blush/30 text-ink ring-1 ring-blush/50",
    formResendCodeLink: "text-brown font-semibold",
    identityPreviewEditButton: "text-brown",
  },
};
