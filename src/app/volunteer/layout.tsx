import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volunteer | Deen Relief",
  description:
    "Join our team of dedicated volunteers across the UK and abroad. Help with Bangladesh housing, clean water, community support, and Brighton homeless outreach. Charity No. 1158608.",
  openGraph: {
    title: "Volunteer With Us | Deen Relief",
    description: "Join our team of dedicated volunteers across the UK and abroad. No experience needed — just a willingness to help.",
    images: [{ url: "/images/brighton-team.png", alt: "Deen Relief volunteers" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
