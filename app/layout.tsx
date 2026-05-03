import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";

import "./globals.css";
import { PostHogPageView } from "./posthog-pageview";
import { PostHogProvider } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans"
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Updateflow",
  description: "Turn messy meeting notes into project-ready updates."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} min-h-screen bg-bg-paper font-sans text-text-ink antialiased`}
      >
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
