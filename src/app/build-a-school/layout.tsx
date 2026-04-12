import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build a School in Bangladesh | Deen Relief",
  description:
    "Fund classroom construction and teacher salaries in rural Bangladesh. Give children access to primary education — a lasting Sadaqah Jariyah. Gift Aid eligible. Charity No. 1158608.",
  openGraph: {
    title: "Build a School in Bangladesh | Deen Relief",
    description: "Fund classroom construction and teacher salaries. Give children access to education — a lasting Sadaqah Jariyah.",
    images: [{ url: "/images/bangladesh-school-v2.webp", alt: "Children at a Deen Relief school in Bangladesh" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
