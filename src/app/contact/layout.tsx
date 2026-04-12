import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Deen Relief",
  description:
    "Get in touch with Deen Relief. Phone: +44 (0) 300 365 8899. Email: info@deenrelief.org. Offices in London and Brighton. Charity No. 1158608.",
  openGraph: {
    title: "Contact Us | Deen Relief",
    description: "Get in touch with Deen Relief. Phone: +44 (0) 300 365 8899. Email: info@deenrelief.org.",
    images: [{ url: "/images/brighton-team.png", alt: "Deen Relief team in Brighton" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
