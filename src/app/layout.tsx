import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LoveStory — A tiny magical world created for one person ❤️",
  description:
    "LoveStory lets you create a premium, cinematic, personalized romantic website for someone special. Pay ₹9, get 2 love websites, and share a magical digital love letter.",
  keywords: [
    "LoveStory",
    "love letter",
    "romantic website",
    "personalized gift",
    "anniversary",
    "proposal",
    "birthday surprise",
  ],
  authors: [{ name: "LoveStory" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "LoveStory — A tiny magical world created for one person ❤️",
    description:
      "Create a premium, cinematic, personalized romantic website for someone special.",
    siteName: "LoveStory",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoveStory",
    description:
      "Create a premium, cinematic, personalized romantic website for someone special.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF4F81",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${poppins.variable} antialiased`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
