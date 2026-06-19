import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ashraya — Community Welfare Case Reporting",
  description:
    "Ashraya — community welfare case reporting for Indian nationals in the UAE. Built by Telangana Friends Association in collaboration with the Embassy of India.",
};

import { SiteFooter } from "@/components/brand/SiteFooter";
import { HelpWidget } from "@/components/HelpWidget";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-brand-surface">
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <HelpWidget />
      </body>
    </html>
  );
}
