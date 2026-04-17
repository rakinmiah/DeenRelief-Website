import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Donate | Deen Relief",
  description:
    "Complete your donation to Deen Relief. Secure checkout, Gift Aid eligible. Charity No. 1158608.",
  alternates: { canonical: "/donate" },
  robots: { index: false, follow: true },
};

const campaignLabels: Record<string, string> = {
  palestine: "Palestine Emergency Relief",
  "cancer-care": "Cancer Care",
  "orphan-sponsorship": "Orphan Sponsorship",
  "build-a-school": "Build a School",
  "clean-water": "Clean Water",
  "uk-homeless": "UK Homeless",
  zakat: "Zakat",
  sadaqah: "Sadaqah",
};

interface DonatePageProps {
  searchParams: Promise<{
    campaign?: string;
    amount?: string;
    frequency?: string;
  }>;
}

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const params = await searchParams;
  const campaign = params.campaign ?? "general";
  const amount = Number(params.amount) || 0;
  const frequency = params.frequency === "monthly" ? "monthly" : "one-time";
  const campaignLabel = campaignLabels[campaign] ?? "General Donation";

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="min-h-[70vh] flex items-center bg-cream pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 sm:p-10 text-center">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Checkout
              </span>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                Complete Your Donation
              </h1>

              {amount > 0 && (
                <div className="my-6 inline-block px-6 py-4 bg-green-light rounded-xl">
                  <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-green/70 mb-1">
                    {campaignLabel}
                  </p>
                  <p className="text-3xl font-heading font-bold text-charcoal">
                    £{amount.toLocaleString()}
                    {frequency === "monthly" && (
                      <span className="text-base font-medium text-grey">
                        {" "}
                        / month
                      </span>
                    )}
                  </p>
                  <p className="text-[13px] text-green/80 font-medium mt-1">
                    With Gift Aid: £{Math.round(amount * 1.25).toLocaleString()}
                  </p>
                </div>
              )}

              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6 max-w-md mx-auto">
                Our secure checkout is launching soon. In the meantime, please
                contact us directly to complete your donation and we&apos;ll
                process it with full Gift Aid support.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="mailto:donate@deenrelief.org?subject=Donation%20Enquiry"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-amber text-charcoal hover:bg-amber-dark font-semibold shadow-sm text-base transition-colors duration-200"
                >
                  Email donate@deenrelief.org
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal/5 font-semibold text-base transition-colors duration-200"
                >
                  Contact Us
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-[12px] text-charcoal/40 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-charcoal/15">|</span>
                <span>100% to relief</span>
                <span className="text-charcoal/15">|</span>
                <span>Gift Aid eligible</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
