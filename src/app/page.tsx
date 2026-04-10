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
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>

      <Header />

      <main id="main-content" className="flex-1">
        <Hero />
        <TrustBar />
        <FeaturedCampaign />
        <CancerCareCentres />
        <GivingPathways />
        <CampaignsGrid />
        <Impact />
        <OurStory />
        <Partners />
        <Newsletter />
      </main>

      <Footer />
    </>
  );
}
