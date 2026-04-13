import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Islamic Knowledge & Charity Blog | Deen Relief",
  description:
    "Guides on Zakat, Sadaqah Jariyah, and Islamic giving. Learn to calculate Zakat, understand charity in Islam, and give with confidence.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Islamic Knowledge & Charity Blog | Deen Relief",
    description:
      "Guides on Zakat, Sadaqah Jariyah, and Islamic giving. Learn to calculate Zakat, understand charity in Islam, and give with confidence.",
    images: [{ url: "/images/hero-gulucuk-evi.webp", alt: "Deen Relief" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Islamic Knowledge & Charity Blog | Deen Relief",
    description:
      "Guides on Zakat, Sadaqah Jariyah, and Islamic giving. Learn to calculate Zakat, understand charity in Islam, and give with confidence.",
    images: ["/images/hero-gulucuk-evi.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
