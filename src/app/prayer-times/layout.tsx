import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muslim Prayer Times UK | Deen Relief",
  description:
    "Accurate Muslim prayer times for 38 UK cities including London, Birmingham, Manchester, Brighton, and more. Fajr, Dhuhr, Asr, Maghrib, Isha times updated daily.",
  openGraph: {
    title: "Muslim Prayer Times UK | Deen Relief",
    description: "Accurate prayer times for 38 UK cities. Fajr, Dhuhr, Asr, Maghrib, Isha — updated daily.",
    images: [{ url: "/images/hero-gulucuk-evi.webp", alt: "Deen Relief" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
