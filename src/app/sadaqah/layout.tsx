import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Give Sadaqah | Deen Relief",
  description:
    "Give voluntary charity (Sadaqah) to transform lives. No minimum, no calculation — just generosity. 100% to those in need. Gift Aid eligible. Charity No. 1158608.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
