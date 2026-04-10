import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";

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

        {/* Placeholder: more modules coming next */}
        <section className="py-24 text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-grey text-lg">
              More sections coming soon — Featured Campaign, Cancer Care
              Centres, Islamic Giving Pathways, and more.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
