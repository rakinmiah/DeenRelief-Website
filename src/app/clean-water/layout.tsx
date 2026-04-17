import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Fund Clean Water in Bangladesh | Deen Relief";
const description =
  "Fund a tube well in rural Bangladesh — safe drinking water for an entire community, a lasting Sadaqah Jariyah. 3,200+ donors since 2013. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/clean-water" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/bangladesh-community-children.webp", alt: "Deen Relief workers with children in Bangladesh" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/bangladesh-community-children.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "clean-water",
  canonicalPath: "/clean-water",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Bangladesh Clean Water Appeal",
  fundraisingDescription:
    "Fund tube wells providing safe drinking water to rural Bangladeshi communities — a lasting Sadaqah Jariyah.",
  location: { name: "Bangladesh", country: "BD" },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
