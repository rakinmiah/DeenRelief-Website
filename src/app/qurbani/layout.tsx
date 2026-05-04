import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Donate Your Qurbani 2026 | Deen Relief";
const description =
  "Donate your Qurbani from £50 — Bangladesh, India, Pakistan, Syria. Trusted by 3,200+ donors since 2013. Gift Aid eligible. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  // Page is reachable for paid traffic but excluded from search until launch.
  // Flip to { index: true, follow: true } once we add it to sitemap + nav.
  robots: { index: false, follow: false },
  alternates: { canonical: "/qurbani" },
  openGraph: {
    title,
    description,
    images: [
      {
        url: "/images/qurbani-hero.webp",
        alt: "Deen Relief team members standing with smiling Bangladeshi children in a rural village",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/qurbani-hero.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "qurbani",
  canonicalPath: "/qurbani",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Qurbani 2026 — Eid al-Adha Appeal",
  fundraisingDescription:
    "Annual Qurbani sacrifice performed locally in Bangladesh, India, Pakistan, and Syria with the meat distributed to families in need.",
  minPrice: 50,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
