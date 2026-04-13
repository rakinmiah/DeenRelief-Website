import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UK Homeless Community Aid | Deen Relief",
  description:
    "Hot meals, clothing, and essentials for Brighton's homeless community every week since 2013. Gift Aid eligible. Charity No. 1158608.",
  alternates: { canonical: "/uk-homeless" },
  openGraph: {
    title: "UK Homeless Community Aid | Deen Relief",
    description: "Hot meals, clothing, and essentials for Brighton's homeless community every week since 2013. Gift Aid eligible. Charity No. 1158608.",
    images: [{ url: "/images/brighton-team.webp", alt: "Deen Relief volunteers at Brighton seafront" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "UK Homeless Community Aid | Deen Relief",
    description: "Hot meals, clothing, and essentials for Brighton's homeless community every week since 2013. Gift Aid eligible. Charity No. 1158608.",
    images: ["/images/brighton-team.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
