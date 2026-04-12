import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volunteer | Deen Relief",
  description:
    "Join our team of dedicated volunteers across the UK and abroad. Help with Bangladesh housing, clean water, community support, and Brighton homeless outreach. Charity No. 1158608.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
