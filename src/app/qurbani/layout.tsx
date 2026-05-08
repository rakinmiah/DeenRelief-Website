import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Donate Your Qurbani 2026 | Deen Relief";
const description =
  "Donate your Qurbani from £50 — Bangladesh, India, Pakistan, Syria. Trusted by 3,200+ donors since 2013. Gift Aid eligible. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/qurbani" },
  openGraph: {
    title,
    description,
    images: [
      {
        url: "/images/qurbani-hero-v4-og.jpg",
        width: 1200,
        height: 630,
        alt: "A Deen Relief field worker in a Deen-Relief-branded shirt with around twenty Bangladeshi children at a Qurbani distribution",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/qurbani-hero-v4-og.jpg"],
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
