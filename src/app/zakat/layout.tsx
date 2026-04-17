import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Pay Your Zakat With Confidence | Deen Relief";
const description =
  "3,200+ donors since 2013 trust Deen Relief's 100% Zakat policy — every penny reaches eligible recipients. Gift Aid eligible. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/zakat" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/palestine-relief.webp", alt: "Deen Relief aid distribution" }],
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
  slug: "zakat",
  canonicalPath: "/zakat",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Zakat Collection",
  fundraisingDescription:
    "Collect and distribute Zakat to eligible recipients worldwide under a strict 100% Zakat policy.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
