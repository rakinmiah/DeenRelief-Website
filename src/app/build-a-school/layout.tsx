import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildDonationPageSchema } from "@/lib/donationSchema";

const title = "Build a School in Bangladesh | Deen Relief";
const description =
  "Fund classrooms and teacher salaries in rural Bangladesh — a lasting Sadaqah Jariyah. 3,200+ donors since 2013. Gift Aid eligible. Charity No. 1158608.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/build-a-school" },
  openGraph: {
    title,
    description,
    images: [{ url: "/images/bangladesh-school-v2.webp", alt: "Children at a Deen Relief school in Bangladesh" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/bangladesh-school-v2.webp"],
  },
};

const donationSchema = buildDonationPageSchema({
  slug: "build-a-school",
  canonicalPath: "/build-a-school",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Build a School Appeal",
  fundraisingDescription:
    "Fund classrooms, teacher salaries, and learning materials in rural Bangladesh — a lasting Sadaqah Jariyah giving children access to education.",
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
