import Header from "@/components/Header";
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
