import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Give Sadaqah and Sadaqah Jariyah | Deen Relief";
const description =
  "Give Sadaqah and Sadaqah Jariyah through a trusted UK Islamic charity. 3,200+ donors since 2013, no minimum, delivered directly to those in need. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/sadaqah" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/orphan-sponsorship.webp", alt: "Deen Relief worker with a child in Bangladesh" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/orphan-sponsorship.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "sadaqah",
  canonicalPath: "/sadaqah",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Sadaqah & Sadaqah Jariyah",
  fundraisingDescription:
    "Collect and distribute Sadaqah and Sadaqah Jariyah to those most in need worldwide, including Gift Aid support.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
