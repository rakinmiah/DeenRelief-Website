import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";

const campaigns = [
  {
    title: "Palestine Emergency Relief",
    description:
      "Our teams distribute food parcels, clean water, medical supplies, and shelter materials directly to displaced families across Gaza. Every donation is verified, allocated, and reported with full transparency.",
    stat: "100% to emergency relief",
    image: "/images/palestine-relief.webp",
    imageAlt: "Deen Relief worker distributing aid to a family in Gaza",
    location: "Gaza",
    date: "2026",
    href: "/palestine",
    cta: "Help a Family Now",
    urgent: true,
  },
  {
    title: "Cancer Care for Refugee Children",
    description:
      "At Gulucuk Evi in Adana, Turkey, we provide housing, medical financial aid, nutrition programmes, and spiritual support for Syrian and Gazan refugee children undergoing cancer treatment. Our team is present with every family throughout their journey.",
    stat: "Gulucuk Evi — The House of Smiles",
    image: "/images/cancer-children-worker.webp",
    imageAlt: "Deen Relief team member with children at Gulucuk Evi cancer care centre",
    location: "Adana, Turkey",
    href: "/cancer-care",
    cta: "Support Cancer Care",
  },
  {
    title: "Orphan Sponsorship in Bangladesh",
    description:
      "For £30 a month, you provide an orphaned child with education, daily nutrition, safe shelter, and healthcare. Every sponsorship is tracked and reported — giving a child the foundations they need to thrive.",
    stat: "£30/month changes a life",
    image: "/images/orphan-sponsorship.webp",
    imageAlt: "Deen Relief team member with a sponsored child in Bangladesh",
    location: "Bangladesh",
    href: "/orphan-sponsorship",
    cta: "Sponsor a Child",
  },
  {
    title: "Build a School in Bangladesh",
    description:
      "We fund classroom construction and teacher salaries in rural Bangladesh, giving children access to primary education for the first time. A school built today is a Sadaqah Jariyah — ongoing charity that educates generations.",
    stat: "Sadaqah Jariyah — lasting reward",
    image: "/images/bangladesh-school-v2.webp",
    imageAlt: "Children at a Deen Relief school in Bangladesh",
    location: "Bangladesh",
    href: "/build-a-school",
    cta: "Fund a Classroom",
  },
  {
    title: "Clean Water for Rural Communities",
    description:
      "A single tube well provides safe drinking water for an entire village in rural Bangladesh. Children who spent hours walking to collect water now spend that time in school. Illness drops. Communities grow.",
    stat: "Sadaqah Jariyah — water for years",
    image: "/images/bangladesh-community-children.webp",
    imageAlt: "Deen Relief workers with children in a Bangladesh community",
    location: "Bangladesh",
    href: "/clean-water",
    cta: "Fund a Well",
  },
  {
    title: "UK Homeless Community Aid",
    description:
      "Every week since 2013, our volunteer teams distribute hot meals, warm clothing, hygiene packs, and essentials on Brighton's streets. The outreach that started Deen Relief continues to this day — rain or shine.",
    stat: "Every week since 2013",
    image: "/images/brighton-team.webp",
    imageAlt: "Deen Relief volunteers at Brighton seafront",
    location: "Brighton, UK",
    href: "/uk-homeless",
    cta: "Support Our Outreach",
  },
  {
    title: "Pay Your Zakat",
    description:
      "Fulfill your Zakat with confidence through a 100% Zakat policy. Every penny reaches eligible recipients — verified by our trustees before funds are released. Choose from four pathways: emergency relief, medical support, family essentials, or recovery.",
    stat: "100% Zakat policy",
    image: "/images/cancer-children-signs.webp",
    imageAlt: "Children at Deen Relief's care centre holding Deen Relief signs",
    location: "Adana, Turkey",
    href: "/zakat",
    cta: "Pay Zakat Now",
  },
  {
    title: "Give Sadaqah",
    description:
      "Voluntary charity given freely, at any time, in any amount. Your Sadaqah is directed where the need is greatest — from emergency relief in Gaza to orphan care in Bangladesh. No minimum. Every act of generosity is rewarded.",
    stat: "No minimum — every penny counts",
    image: "/images/cancer-care-selfie.webp",
    imageAlt: "Deen Relief team member with a child undergoing cancer treatment",
    location: "Adana, Turkey",
    href: "/sadaqah",
    cta: "Give Sadaqah",
  },
];

export default function OurWorkPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Our Work", href: "/our-work" }]} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative min-h-[45vh] md:min-h-[50vh] flex items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hero-our-work.webp"
              alt="Children undergoing cancer treatment at Deen Relief's Gulucuk Evi care centre"
              fill
              className="object-cover object-[center_40%]"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(26,26,46,0.93) 0%, rgba(26,26,46,0.88) 35%, rgba(26,26,46,0.62) 52%, rgba(26,26,46,0.20) 75%, rgba(26,26,46,0.06) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(26,26,46,0.45) 0%, transparent 45%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 md:py-16 lg:py-20">
            <div className="max-w-[22rem] sm:max-w-[26rem] md:max-w-[28rem]">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-white/50 mb-3">
                Our Work
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]">
                Where Your Donations Make an Impact
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 leading-[1.7] max-w-[24rem]">
                From cancer care centres in Turkey to emergency relief in
                Gaza, orphan sponsorship in Bangladesh, and homeless
                outreach in Brighton — every pound is accounted for.
              </p>
            </div>
          </div>

          <ProofTag location="Adana, Turkey" position="bottom-right" />
        </section>

        {/* ─── Campaign Sections ─── */}
        {campaigns.map((campaign, i) => {
          const isEven = i % 2 === 0;
          const bg = isEven ? "bg-white" : "bg-cream";

          return (
            <section key={campaign.title} className={`py-16 md:py-24 ${bg}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${!isEven ? "lg:grid-flow-dense" : ""}`}>
                  {/* Image */}
                  <div className={`relative rounded-2xl overflow-hidden aspect-[5/4] ${!isEven ? "lg:col-start-2" : ""}`}>
                    <Image
                      src={campaign.image}
                      alt={campaign.imageAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    {campaign.urgent && (
                      <span className="absolute top-3 left-3 z-10 inline-block text-[10px] font-bold tracking-[0.08em] uppercase text-amber-dark bg-amber-light px-3 py-1 rounded-md">
                        Urgent Appeal
                      </span>
                    )}
                    <ProofTag
                      location={campaign.location}
                      date={campaign.date}
                      position="bottom-right"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                      {campaign.title}
                    </h2>
                    <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                      {campaign.description}
                    </p>
                    <p className="text-green text-sm font-semibold mb-6">
                      {campaign.stat}
                    </p>
                    <Button variant="primary" href={campaign.href}>
                      {campaign.cta}
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* ─── Trust Bar ─── */}
        <section className="py-7 md:py-8 bg-green-dark">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/60 text-[12px] font-medium">
              <span>Charity No. 1158608</span>
              <span className="text-white/20">|</span>
              <span>100% Zakat Policy</span>
              <span className="text-white/20">|</span>
              <span>12+ Years of Impact</span>
              <span className="text-white/20">|</span>
              <span>5+ Countries</span>
              <span className="text-white/20">|</span>
              <span>Gift Aid Eligible</span>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Every Donation Makes a Difference
            </h2>
            <p className="text-white/55 text-sm mb-6">
              3,200+ families supported since 2013. Choose where your
              generosity goes.
            </p>
            <Button variant="primary" href="/#donate">
              Donate Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
