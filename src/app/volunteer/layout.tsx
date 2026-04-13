import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volunteer | Deen Relief",
  description:
    "Join our volunteer team across the UK and abroad. Brighton outreach, Bangladesh housing, clean water projects, and more. No experience needed.",
  alternates: { canonical: "/volunteer" },
  openGraph: {
    title: "Volunteer With Us | Deen Relief",
    description: "Join our volunteer team across the UK and abroad. Brighton outreach, Bangladesh housing, clean water projects, and more. No experience needed.",
    images: [{ url: "/images/brighton-team.webp", alt: "Deen Relief volunteers" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Volunteer With Us | Deen Relief",
    description: "Join our volunteer team across the UK and abroad. Brighton outreach, Bangladesh housing, clean water projects, and more. No experience needed.",
    images: ["/images/brighton-team.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
