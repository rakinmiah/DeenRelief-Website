import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancer Care Centres | Deen Relief",
  description:
    "Support Gulucuk Evi — the House of Smiles — in Adana, Turkey. Housing, medical aid, nutrition, and care for Syrian and Gazan refugee children undergoing cancer treatment. Charity No. 1158608.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
