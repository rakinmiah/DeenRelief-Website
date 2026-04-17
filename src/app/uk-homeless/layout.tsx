import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Support Brighton's Homeless Community | Deen Relief";
const description =
  "Hot meals and essentials for Brighton's homeless every week since 2013 — 12+ years without missing one. 3,200+ donors. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/uk-homeless" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/brighton-team.webp", alt: "Deen Relief volunteers at Brighton seafront" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/brighton-team.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "uk-homeless",
  canonicalPath: "/uk-homeless",
  pageName: title,
  pageDescription: description,
  fundraisingName: "UK Homeless Community Aid",
  fundraisingDescription:
    "Weekly hot meals, clothing, and essentials for Brighton's homeless community, running continuously since 2013.",
  location: { name: "Brighton", region: "East Sussex", country: "GB" },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={donationSchema} />
      {children}
    </>
  );
}
