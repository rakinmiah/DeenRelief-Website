import type { Metadata } from "next";
import { Source_Serif_4, DM_Sans } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deen Relief | Helping Poor, Vulnerable and Disabled Children Globally",
  description:
    "UK-registered Islamic charity (No. 1158608) providing cancer care for refugee children, emergency relief, orphan sponsorship, and community support worldwide.",
  metadataBase: new URL("https://deenrelief.org"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Deen Relief",
    title: "Deen Relief | Helping Poor, Vulnerable and Disabled Children Globally",
    description:
      "UK-registered Islamic charity providing cancer care for refugee children, emergency relief, orphan sponsorship, and community support worldwide.",
    images: [
      {
        url: "/images/hero-gulucuk-evi.webp",
        width: 966,
        height: 722,
        alt: "Deen Relief — Helping Children Globally",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Deen Relief | Helping Poor, Vulnerable and Disabled Children Globally",
    description:
      "UK-registered Islamic charity providing cancer care, emergency relief, orphan sponsorship, and community support worldwide.",
    images: ["/images/hero-gulucuk-evi.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body text-charcoal bg-white">
        {children}
      </body>
    </html>
  );
}
