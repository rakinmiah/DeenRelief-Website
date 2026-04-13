import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancer Care Centres | Deen Relief",
  description:
    "Support Gulucuk Evi in Adana, Turkey. Housing, medical aid, and care for Syrian and Gazan refugee children undergoing cancer treatment. Charity No. 1158608.",
  alternates: { canonical: "/cancer-care" },
  openGraph: {
    title: "Cancer Care Centres — Gulucuk Evi | Deen Relief",
    description: "Support Gulucuk Evi in Adana, Turkey. Housing, medical aid, and care for Syrian and Gazan refugee children undergoing cancer treatment. Charity No. 1158608.",
    images: [{ url: "/images/cancer-children-worker.webp", alt: "Deen Relief worker with children at Gulucuk Evi" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Cancer Care Centres — Gulucuk Evi | Deen Relief",
    description: "Support Gulucuk Evi in Adana, Turkey. Housing, medical aid, and care for Syrian and Gazan refugee children undergoing cancer treatment. Charity No. 1158608.",
    images: ["/images/cancer-children-worker.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
