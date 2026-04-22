/**
 * /manage/done
 *
 * Where Stripe's Billing Portal returns the donor after they've finished
 * managing their subscription (cancel, update card, etc.). We don't know
 * exactly what they did — Stripe fires webhooks (customer.subscription.
 * deleted, customer.subscription.updated) that we handle separately.
 * This page is just a friendly "you're done" confirmation.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Done | Deen Relief",
  robots: { index: false, follow: false },
};

export default function ManageDonePage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="bg-cream pt-24 pb-16 md:pt-32 md:pb-24 min-h-[60vh]">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 sm:p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-light flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-green" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-4">
                All done
              </h1>
              <p className="text-grey leading-relaxed mb-6">
                Your changes have been saved. If you&apos;ve cancelled or
                updated your monthly donation, we&apos;ll receive the update
                automatically — no further action needed.
              </p>
              <p className="text-grey/70 text-sm mb-8">
                Thank you for your generosity. May Allāh reward you for every
                life you have helped.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-green text-white hover:bg-green-dark font-semibold text-base transition-colors duration-200"
                >
                  Back to home
                </Link>
                <Link
                  href="/our-work"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal/5 font-semibold text-base transition-colors duration-200"
                >
                  See the impact
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
