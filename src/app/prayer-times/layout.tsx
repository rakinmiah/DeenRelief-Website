import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prayer Times UK Today — Salah Times | Deen Relief",
  description:
    "Accurate prayer times for 96+ UK cities including London, Birmingham, Manchester, and Brighton. Fajr, Dhuhr, Asr, Maghrib, Isha updated daily.",
  alternates: { canonical: "/prayer-times" },
  openGraph: {
    title: "Prayer Times UK Today — Salah Times | Deen Relief",
    description: "Accurate prayer times for 96+ UK cities including London, Birmingham, Manchester, and Brighton. Fajr, Dhuhr, Asr, Maghrib, Isha updated daily.",
    images: [{ url: "/images/hero-gulucuk-evi.webp", alt: "Deen Relief" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Prayer Times UK Today — Salah Times | Deen Relief",
    description: "Accurate prayer times for 96+ UK cities including London, Birmingham, Manchester, and Brighton. Fajr, Dhuhr, Asr, Maghrib, Isha updated daily.",
    images: ["/images/hero-gulucuk-evi.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
