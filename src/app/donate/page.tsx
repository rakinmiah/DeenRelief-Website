import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutClient from "./CheckoutClient";
import { getCampaignLabel, isValidCampaign } from "@/lib/campaigns";

export const metadata: Metadata = {
  title: "Donate | Deen Relief",
  description:
    "Complete your donation to Deen Relief. Secure checkout, Gift Aid eligible. Charity No. 1158608.",
  alternates: { canonical: "/donate" },
  robots: { index: false, follow: true },
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

  // Seed values from the query string. The client component owns mutation
  // from here — users can adjust amount in checkout without navigating back.
  const campaign = params.campaign && isValidCampaign(params.campaign)
    ? params.campaign
    : "general";
  const parsedAmount = Number(params.amount);
  const amountGbp = Number.isFinite(parsedAmount) && parsedAmount > 0
    ? Math.floor(parsedAmount)
    : 50; // sensible default
  const frequency: "one-time" | "monthly" =
    params.frequency === "monthly" ? "monthly" : "one-time";

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="bg-cream pt-24 pb-16 md:pt-32 md:pb-24 min-h-[80vh]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <CheckoutClient
              initialCampaign={campaign}
              campaignLabel={getCampaignLabel(campaign)}
              initialAmountGbp={amountGbp}
              initialFrequency={frequency}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
