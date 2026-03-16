import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Syne, Space_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

import { ThemeProvider } from "@/components/ThemeProvider";
import { GridInspector } from "@/components/GridInspector";
import { AppShell } from "@/components/AppShell";
import CommandPalette from "@/components/CommandPalette";
import { GlobalChat } from "@/components/GlobalChat";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "AI Systems Console",
  description: "Next.js Architectural Playground",
};

import { ChatProvider } from "@/hooks/useGlobalChat";
import { Suspense } from "react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.className} ${syne.className} ${spaceMono.className} antialiased`}
      >
        <ThemeProvider>
          <ChatProvider>
            <AppShell user={user}>{children}</AppShell>
            <Suspense fallback={null}>
              <GlobalChat />
            </Suspense>
            <GridInspector />
            <CommandPalette />
          </ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
