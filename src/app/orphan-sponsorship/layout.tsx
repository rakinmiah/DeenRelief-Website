import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsor an Orphan | Deen Relief",
  description:
    "Sponsor an orphaned child in Bangladesh for £30/month. Providing education, nutrition, safe shelter, and healthcare. Gift Aid eligible. Cancel anytime. Charity No. 1158608.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
