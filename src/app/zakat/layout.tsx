import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay Zakat | Deen Relief",
  description:
    "Fulfil your Zakat with confidence. 100% Zakat policy — every penny reaches eligible recipients. Trustee-verified, Gift Aid eligible. Charity No. 1158608.",
  openGraph: {
    title: "Pay Zakat | Deen Relief",
    description: "Fulfil your Zakat with confidence. 100% Zakat policy — every penny reaches eligible recipients.",
    images: [{ url: "/images/palestine-relief.jpg", alt: "Deen Relief aid distribution" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
