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
    colorPrimary: "#8A6F61", // soft brown — accents, links, focus
    colorPrimaryForeground: "#FFF8EF", // cream — text on a primary-colored surface
    colorForeground: "#2B2523", // ink — default text
    colorMutedForeground: "#8A6F61", // soft brown — secondary/muted text
    colorBackground: "#FFF8EF", // cream
    colorInput: "#FFFDF9", // soft input background
    colorInputForeground: "#2B2523", // ink — input text
    colorDanger: "#C56A6A",
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
