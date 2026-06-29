import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { clerkAppearance } from "@/lib/clerkAppearance";

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
    <ClerkProvider appearance={clerkAppearance}>
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
