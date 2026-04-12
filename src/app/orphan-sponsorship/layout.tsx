import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsor an Orphan | Deen Relief",
  description:
    "Sponsor an orphaned child in Bangladesh for £30/month. Providing education, nutrition, safe shelter, and healthcare. Gift Aid eligible. Cancel anytime. Charity No. 1158608.",
  openGraph: {
    title: "Sponsor an Orphan — £30/month | Deen Relief",
    description: "Give a child a future for £30 a month. Education, nutrition, safe shelter, and healthcare.",
    images: [{ url: "/images/children-smiling-deenrelief.webp", alt: "Children supported by Deen Relief" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
