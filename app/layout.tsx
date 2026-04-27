import type { Metadata } from "next";
import "./globals.css";
import { PostHogProvider } from "./providers";
import { PostHogPageView } from "./posthog-pageview";
import { Suspense } from "react";

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
      <body className="min-h-screen bg-bg text-text font-serif">
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
