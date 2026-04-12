import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancer Care Centres | Deen Relief",
  description:
    "Support Gulucuk Evi — the House of Smiles — in Adana, Turkey. Housing, medical aid, nutrition, and care for Syrian and Gazan refugee children undergoing cancer treatment. Charity No. 1158608.",
  openGraph: {
    title: "Cancer Care Centres — Gulucuk Evi | Deen Relief",
    description: "A home for children fighting cancer. Housing, medical aid, and care for refugee children in Adana, Turkey.",
    images: [{ url: "/images/cancer-children-worker.webp", alt: "Deen Relief worker with children at Gulucuk Evi" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
