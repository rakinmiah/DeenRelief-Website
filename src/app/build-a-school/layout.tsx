import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build a School in Bangladesh | Deen Relief",
  description:
    "Fund classroom construction and teacher salaries in rural Bangladesh. Give children access to primary education — a lasting Sadaqah Jariyah. Gift Aid eligible. Charity No. 1158608.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
