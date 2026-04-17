import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Support Cancer Care for Refugee Children | Deen Relief";
const description =
  "Support Gulucuk Evi in Adana — housing and care for Syrian and Gazan refugee children with cancer. 3,200+ donors since 2013. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cancer-care" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/cancer-children-worker.webp", alt: "Deen Relief worker with children at Gulucuk Evi" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/cancer-children-worker.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "cancer-care",
  canonicalPath: "/cancer-care",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Cancer Care Centres — Gulucuk Evi",
  fundraisingDescription:
    "Fund housing, medical aid, and holistic care for Syrian and Gazan refugee children undergoing cancer treatment at Gulucuk Evi in Adana, Turkey.",
  location: { name: "Adana", region: "Adana Province", country: "TR" },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
