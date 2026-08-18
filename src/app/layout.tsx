import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IITGN Walk — Campus Navigation Intelligence",
  description:
    "Campus-specific smart walking route & travel-time platform for IIT Gandhinagar. Fastest / shortest / easiest route comparison, walking-mode-aware ETAs, and continuous learning from student-generated walking data.",
  keywords: [
    "IITGN",
    "IIT Gandhinagar",
    "campus navigation",
    "walking route",
    "Dijkstra",
    "A*",
    "MapLibre",
    "travel time prediction",
  ],
  authors: [{ name: "IITGN Walk" }],
  manifest: "/manifest.json",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "IITGN Walk — Campus Navigation Intelligence",
    description:
      "Campus-specific smart walking route & travel-time platform for IIT Gandhinagar.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
