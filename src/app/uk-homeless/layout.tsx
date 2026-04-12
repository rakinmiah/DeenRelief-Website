import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UK Homeless Community Aid | Deen Relief",
  description:
    "Supporting homeless communities in Brighton and across the UK with hot meals, clothing, and essentials every week since 2013. Gift Aid eligible. Charity No. 1158608.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
