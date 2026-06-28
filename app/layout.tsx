import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { ListsProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${nunito.variable} h-full`}
    >
      <head>
        {/* color-emoji fallback for platforms without a native emoji font (e.g. some Linux). Native emoji are used first, so this only downloads when actually needed. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
        />
      </head>
      <body className="min-h-full">
        <ListsProvider>
          <AppShell>{children}</AppShell>
        </ListsProvider>
      </body>
    </html>
  );
}
