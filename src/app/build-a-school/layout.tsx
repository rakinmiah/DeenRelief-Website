import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build a School in Bangladesh | Deen Relief",
  description:
    "Fund classrooms and teacher salaries in rural Bangladesh. A lasting Sadaqah Jariyah giving children access to education. Gift Aid eligible.",
  alternates: { canonical: "/build-a-school" },
  openGraph: {
    title: "Build a School in Bangladesh | Deen Relief",
    description: "Fund classrooms and teacher salaries in rural Bangladesh. A lasting Sadaqah Jariyah giving children access to education. Gift Aid eligible.",
    images: [{ url: "/images/bangladesh-school-v2.webp", alt: "Children at a Deen Relief school in Bangladesh" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Build a School in Bangladesh | Deen Relief",
    description: "Fund classrooms and teacher salaries in rural Bangladesh. A lasting Sadaqah Jariyah giving children access to education. Gift Aid eligible.",
    images: ["/images/bangladesh-school-v2.webp"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
