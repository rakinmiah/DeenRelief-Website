import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Deen Relief | Helping Poor, Vulnerable and Disabled Children Globally",
  description:
    "UK-registered Islamic charity (No. 1158608) providing cancer care for refugee children, emergency relief in Gaza, orphan sponsorship in Bangladesh, and community support. Donate Zakat, Sadaqah, and more.",
};
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import FeaturedCampaign from "@/components/FeaturedCampaign";
import CancerCareCentres from "@/components/CancerCareCentres";
import GivingPathways from "@/components/GivingPathways";
import CampaignsGrid from "@/components/CampaignsGrid";
import Impact from "@/components/Impact";
import OurStory from "@/components/OurStory";
import Partners from "@/components/Partners";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />

      <main id="main-content" className="flex-1">
        <Hero />
        <Partners />
        <FeaturedCampaign />
        <CancerCareCentres />
        <GivingPathways />
        <TrustBar />
        <CampaignsGrid />
        <Impact />
        <OurStory />
        <Newsletter />
      </main>

      <Footer />
    </>
  );
}
