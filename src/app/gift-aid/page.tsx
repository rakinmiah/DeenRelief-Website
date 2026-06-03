import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CAMPAIGNS } from "@/lib/campaigns";
import GiftAidFormClient from "./GiftAidFormClient";

export const metadata: Metadata = {
  title: "Gift Aid Declaration | Deen Relief",
  description:
    "Already donated to Deen Relief by bank transfer or cash? Complete a Gift Aid declaration so we can reclaim 25% from HMRC at no cost to you.",
  // Utility form — not a page we want indexed or ranked.
  robots: { index: false, follow: false },
};

/**
 * Public, shareable Gift Aid declaration form for OFFLINE donations
 * (bank transfer / cash). Submitting it records the donor + declaration
 * and creates a PENDING donation in DR Admin that an admin confirms.
 *
 * The charity sends the link (deenrelief.org/gift-aid) to a donor by
 * email or WhatsApp.
 */
export default function GiftAidPage() {
  const campaigns = Object.entries(CAMPAIGNS).map(([slug, label]) => ({
    slug,
    label,
  }));

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 bg-cream">
        <section className="py-12 md:py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-2">
                Gift Aid
              </span>
              <h1 className="text-charcoal font-heading font-bold text-3xl sm:text-4xl leading-tight">
                Gift Aid your donation
              </h1>
              <p className="text-grey text-base mt-3 leading-relaxed">
                Already donated to Deen Relief by bank transfer or another way?
                If you&apos;re a UK taxpayer, Gift Aid lets us reclaim an extra
                25% from HMRC — at no cost to you. Just confirm a few details
                below.
              </p>
            </div>
            <GiftAidFormClient campaigns={campaigns} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
