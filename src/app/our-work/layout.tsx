import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Work — Campaigns & Programmes | Deen Relief",
  description:
    "See where your donations go. Emergency relief in Gaza, cancer care in Turkey, orphan sponsorship in Bangladesh, and community support across the UK.",
  alternates: { canonical: "/our-work" },
  openGraph: {
    title: "Our Work — Campaigns & Programmes | Deen Relief",
    description:
      "Emergency relief, cancer care, orphan sponsorship, education, clean water, and community support across five countries.",
    images: [{ url: "/images/hero-gulucuk-evi.webp", alt: "Deen Relief" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Our Work — Campaigns & Programmes | Deen Relief",
    description:
      "Emergency relief, cancer care, orphan sponsorship, education, clean water, and community support across five countries.",
    images: ["/images/hero-gulucuk-evi.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
