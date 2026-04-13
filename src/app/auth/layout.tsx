import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Password Required | Deen Relief",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
