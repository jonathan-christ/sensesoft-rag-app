import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SidebarShell from "@/features/shared/components/sidebar/sidebar-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Akkodis AI",
    template: "%s | Akkodis AI",
  },
  description: "Akkodis AI – chat with and search your documents using Retrieval Augmented Generation.",
  icons: {
    icon: "/akkodis_logo_small.svg",
    shortcut: "/akkodis_logo_small.svg",
    apple: "/akkodis_logo_small.svg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Sidebar visible on Home, Chat, Docs; otherwise children render alone */}
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}
