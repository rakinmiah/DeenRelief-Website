import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Donate to Gaza Emergency Relief | Deen Relief";
const description =
  "Helping 3,200+ donors since 2013 deliver food, water, and medical aid to Gaza families. Gift Aid eligible. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/palestine" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/palestine-relief.webp", alt: "Deen Relief worker distributing aid in Gaza" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/palestine-relief.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "palestine",
  canonicalPath: "/palestine",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Palestine Emergency Appeal",
  fundraisingDescription:
    "Ongoing emergency fundraising to deliver food, clean water, medical supplies, and shelter to displaced families in Gaza.",
  location: { name: "Gaza", region: "Gaza Strip", country: "PS" },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
