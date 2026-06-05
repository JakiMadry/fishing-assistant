import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asystent Wedkarski",
  description: "Warunki, mapa lowisk, AI doradca i dziennik polowow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex">
        {/* Desktop sidebar */}
        <Navigation />
        {/* Content area */}
        <main className="flex-1 flex flex-col min-h-screen pb-16 lg:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
