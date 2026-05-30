import type { Metadata } from "next";
import SponsorHeader from "@/components/SponsorHeader";
import Footer from "@/components/Footer";
import { getSponsorUser } from "@/lib/supabase-server";

/**
 * Sponsor portal layout. Wraps every /sponsor page in the public DeenRelief
 * design language — the real site Footer plus a portal Header styled to match
 * the public Header — so the account area feels like the charity's website,
 * not the admin tool.
 *
 * The whole tree is noindex: these pages are private and must never surface in
 * search, even if a URL leaks.
 */
export const metadata: Metadata = {
  title: { default: "Sponsor account | Deen Relief", template: "%s | Deen Relief" },
  robots: { index: false, follow: false },
};

export default async function SponsorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSponsorUser();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SponsorHeader authed={!!user} />
      {/* pt offset clears the fixed header (py-4 + h-8 logo ≈ 64px). */}
      <main className="flex-1 pt-[68px]">{children}</main>
      <Footer />
    </div>
  );
}
