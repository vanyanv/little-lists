import type { Appearance } from "@clerk/types";

/* One Little Lists skin for every Clerk surface. Warm cream card, ink text,
   soft-brown accents, pill buttons, soft rounded inputs — no harsh blue/black. */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#8A6F61", // soft brown — accents, links, focus
    colorText: "#2B2523", // ink
    colorTextSecondary: "#8A6F61",
    colorBackground: "#FFF8EF", // cream
    colorInputBackground: "#FFFDF9",
    colorInputText: "#2B2523",
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
