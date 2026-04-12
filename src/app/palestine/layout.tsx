import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Palestine Emergency Relief | Deen Relief",
  description:
    "Emergency aid for displaced families in Gaza. Food, clean water, medical supplies, and shelter delivered directly by our on-the-ground teams. 100% to relief. Charity No. 1158608.",
  openGraph: {
    title: "Palestine Emergency Relief | Deen Relief",
    description: "Emergency aid for displaced families in Gaza. 100% of donations go directly to relief.",
    images: [{ url: "/images/palestine-relief.jpg", alt: "Deen Relief worker distributing aid in Gaza" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
