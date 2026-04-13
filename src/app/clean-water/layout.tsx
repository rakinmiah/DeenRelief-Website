import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bangladesh Clean Water | Deen Relief",
  description:
    "Fund a tube well in rural Bangladesh. Provide safe drinking water for an entire community — a lasting Sadaqah Jariyah. Gift Aid eligible. Charity No. 1158608.",
  alternates: { canonical: "/clean-water" },
  openGraph: {
    title: "Bangladesh Clean Water | Deen Relief",
    description: "Fund a tube well in rural Bangladesh. Provide safe drinking water — a lasting Sadaqah Jariyah.",
    images: [{ url: "/images/bangladesh-community-children.webp", alt: "Deen Relief workers with children in Bangladesh" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Bangladesh Clean Water | Deen Relief",
    description: "Fund a tube well in rural Bangladesh. Provide safe drinking water — a lasting Sadaqah Jariyah.",
    images: ["/images/bangladesh-community-children.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
