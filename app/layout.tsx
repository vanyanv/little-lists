import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { clerkAppearance } from "@/lib/clerkAppearance";

// Warm overrides for Clerk's stock copy. This is a partial LocalizationResource:
// Clerk merges it over its built-in English defaults, so every key we don't
// list here (including all error strings) keeps Clerk's default wording.
const clerkLocalization = {
  signUp: {
    start: {
      title: "Make yourself at home",
      subtitle: "A name, an email, and you're in.",
    },
    emailCode: {
      subtitle: "We sent a little code to your email",
    },
  },
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Your little worlds are waiting.",
    },
  },
  formFieldInputPlaceholder__username: "a name you like",
  formFieldInputPlaceholder__emailAddress: "you@somewhere.com",
  formFieldInputPlaceholder__emailAddress_username: "the name or email you picked",
  // Sign-up's password field reads a distinct key from sign-in's.
  formFieldInputPlaceholder__password: "something only you know",
  formFieldInputPlaceholder__signUpPassword: "something only you know",
  unstable__errors: {
    form_identifier_not_found: "We can't find that name or email. One more look?",
    form_password_incorrect: "That password doesn't quite match. Try again 🌿",
  },
};

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Little Lists · your little world",
  description: "Beautiful lists for your taste, plans, and people.",
};

export const viewport: Viewport = {
  themeColor: "#FFF8EF",
  width: "device-width",
  initialScale: 1,
  // pinch-zoom stays enabled for accessibility (WCAG 1.4.4)
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
      <html
        lang="en"
        className={`${fraunces.variable} ${nunito.variable} h-full`}
      >
        <head>
          {/* color-emoji fallback for platforms without a native emoji font */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
          />
        </head>
        <body className="min-h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
