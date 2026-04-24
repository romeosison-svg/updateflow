import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-bg text-text font-serif">{children}</body>
    </html>
  );
}
