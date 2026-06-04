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
        <section className="pt-32 md:pt-36 pb-12 md:pb-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
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

            {/* Don't double up with the website checkout. */}
            <div className="mb-8 rounded-xl border border-green/30 bg-green-light/40 px-4 py-3 flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 shrink-0 text-green" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="text-[13px] text-charcoal/80 leading-relaxed">
                <span className="font-semibold text-charcoal">Donated on our website and ticked Gift Aid at checkout?</span>{" "}
                You don&apos;t need this form — we already have your declaration on file.
                This form is only for donations made <span className="font-semibold">outside</span> the website (bank transfer, cash, cheque).
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
