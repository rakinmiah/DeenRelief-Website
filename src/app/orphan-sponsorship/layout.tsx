import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Sponsor an Orphan in Bangladesh | Deen Relief";
const description =
  "Sponsor an orphan in Bangladesh — £30/month, £37.50 with Gift Aid. 3,200+ donors since 2013. Education, shelter, healthcare. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/orphan-sponsorship" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/children-smiling-deenrelief.webp", alt: "Children supported by Deen Relief" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/children-smiling-deenrelief.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "orphan-sponsorship",
  canonicalPath: "/orphan-sponsorship",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Orphan Sponsorship Programme",
  fundraisingDescription:
    "Monthly sponsorship providing education, nutrition, safe shelter, and healthcare to orphans in Bangladesh.",
  location: { name: "Bangladesh", country: "BD" },
  minPrice: 30,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
