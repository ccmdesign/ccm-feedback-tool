import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://feedback.ccmdesign.ca"),
  title: {
    default: "CCM Feedback — Client feedback, pinned to the pixel",
    template: "%s — CCM Feedback",
  },
  description:
    "Self-hosted feedback widget for ccmdesign clients. DOM-anchored annotations, Supabase-backed, deployable on Netlify.",
  openGraph: {
    title: "CCM Feedback — Client feedback, pinned to the pixel",
    description:
      "Self-hosted feedback widget for ccmdesign clients. DOM-anchored annotations, Supabase-backed, deployable on Netlify.",
    url: "https://feedback.ccmdesign.ca",
    siteName: "CCM Feedback",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CCM Feedback — Client feedback, pinned to the pixel",
    description: "Self-hosted feedback widget for ccmdesign clients. DOM-anchored, Supabase-backed, Netlify-deployed.",
  },
  other: {
    "theme-color": "#030712",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-950 font-sans text-gray-100">{children}</body>
    </html>
  );
}
