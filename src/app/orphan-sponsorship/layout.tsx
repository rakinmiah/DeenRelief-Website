import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsor an Orphan | Deen Relief",
  description:
    "Sponsor an orphan in Bangladesh for £30/month. Education, nutrition, safe shelter, and healthcare. Gift Aid eligible. Charity No. 1158608.",
  alternates: { canonical: "/orphan-sponsorship" },
  openGraph: {
    title: "Sponsor an Orphan — £30/month | Deen Relief",
    description: "Sponsor an orphan in Bangladesh for £30/month. Education, nutrition, safe shelter, and healthcare. Gift Aid eligible. Charity No. 1158608.",
    images: [{ url: "/images/children-smiling-deenrelief.webp", alt: "Children supported by Deen Relief" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Sponsor an Orphan — £30/month | Deen Relief",
    description: "Sponsor an orphan in Bangladesh for £30/month. Education, nutrition, safe shelter, and healthcare. Gift Aid eligible. Charity No. 1158608.",
    images: ["/images/children-smiling-deenrelief.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
