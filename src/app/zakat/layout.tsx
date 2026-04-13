import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay Zakat | Deen Relief",
  description:
    "Fulfill your Zakat with confidence. 100% Zakat policy — every penny reaches eligible recipients. Trustee-verified, Gift Aid eligible. Charity No. 1158608.",
  alternates: { canonical: "/zakat" },
  openGraph: {
    title: "Pay Zakat | Deen Relief",
    description: "Fulfill your Zakat with confidence. 100% Zakat policy — every penny reaches eligible recipients.",
    images: [{ url: "/images/palestine-relief.webp", alt: "Deen Relief aid distribution" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Pay Zakat | Deen Relief",
    description: "Fulfill your Zakat with confidence. 100% Zakat policy — every penny reaches eligible recipients.",
    images: ["/images/palestine-relief.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
