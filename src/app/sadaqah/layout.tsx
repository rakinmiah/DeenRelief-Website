import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Give Sadaqah | Deen Relief",
  description:
    "Give Sadaqah and Sadaqah Jariyah through a trusted UK Islamic charity. No minimum, any amount. 100% to those in need. Gift Aid eligible.",
  alternates: { canonical: "/sadaqah" },
  openGraph: {
    title: "Give Sadaqah | Deen Relief",
    description: "Give Sadaqah and Sadaqah Jariyah through a trusted UK Islamic charity. No minimum, any amount. 100% to those in need. Gift Aid eligible.",
    images: [{ url: "/images/orphan-sponsorship.webp", alt: "Deen Relief worker with a child in Bangladesh" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Give Sadaqah | Deen Relief",
    description: "Give Sadaqah and Sadaqah Jariyah through a trusted UK Islamic charity. No minimum, any amount. 100% to those in need. Gift Aid eligible.",
    images: ["/images/orphan-sponsorship.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
