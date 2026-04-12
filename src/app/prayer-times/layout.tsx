import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muslim Prayer Times UK | Deen Relief",
  description:
    "Accurate Muslim prayer times for 38 UK cities including London, Birmingham, Manchester, Brighton, and more. Fajr, Dhuhr, Asr, Maghrib, Isha times updated daily.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
