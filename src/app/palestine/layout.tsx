import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Palestine Emergency Relief | Deen Relief",
  description:
    "Emergency relief for displaced families in Gaza. Food, water, medical supplies, and shelter delivered by our teams on the ground. Charity No. 1158608.",
  alternates: { canonical: "/palestine" },
  openGraph: {
    title: "Palestine Emergency Relief | Deen Relief",
    description: "Emergency relief for displaced families in Gaza. Food, water, medical supplies, and shelter delivered by our teams on the ground. Charity No. 1158608.",
    images: [{ url: "/images/palestine-relief.webp", alt: "Deen Relief worker distributing aid in Gaza" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Palestine Emergency Relief | Deen Relief",
    description: "Emergency relief for displaced families in Gaza. Food, water, medical supplies, and shelter delivered by our teams on the ground. Charity No. 1158608.",
    images: ["/images/palestine-relief.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
