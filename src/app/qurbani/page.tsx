import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Partners from "@/components/Partners";
import ProcessSteps from "@/components/ProcessSteps";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import LazyVideo from "@/components/LazyVideo";
import DonationForm from "./DonationForm";
import FaqAccordion from "./FaqAccordion";
import HeroDeadline from "./HeroDeadline";
import MiniDonationPicker from "./MiniDonationPicker";

/* ── FAQ data ── */
const faqs = [
  {
    question: "How does my Qurbani reach families in need?",
    answer:
      "Each Qurbani is performed locally in your chosen country during the days of Eid al-Adha, in accordance with Islamic guidelines. Our field teams and verified partners then distribute the meat to families known to be in need — those who would not otherwise have meat on Eid.",
    links: [{ href: "/about", label: "About our team" }],
  },
  {
    question: "Is my Qurbani eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your Qurbani at no additional cost to you. Tick the Gift Aid box during checkout — your £50 sheep share becomes worth £62.50 to the families we serve.",
  },
  {
    question: "What is the deadline for ordering?",
    answer:
      "Orders must be placed by 23 May 2026 to guarantee performance on the first day of Eid. Orders received after this date will be performed on the second or third day of Eid where possible.",
    links: [{ href: "/contact", label: "Contact us about late orders" }],
  },
  {
    question: "Can I split a cow share with my family?",
    answer:
      "Yes. A cow can be shared between up to seven people. Order one share per person — for example, a household of four could order four half-cow shares between two cows. Add each person's name as the donor when prompted at checkout.",
  },
  {
    question: "What animals are eligible, and which countries do you operate in?",
    answer:
      "Sheep and goats count as one share. Cows, buffalo, and camels can be shared between up to seven people. We deliver Qurbani in Bangladesh (sheep £50, cow £480, half cow £240), India (goat £120), Pakistan (sheep £70, cow £480, half cow £240) and Syria (sheep £250, cow £1,300, half cow £650).",
  },
  {
    question: "Can I set up a monthly donation toward next year's Qurbani?",
    answer:
      "Yes. Many donors prefer to spread the cost across the year — £20/month builds toward a goat or half cow Qurbani by next Eid. Set up a monthly donation at any time and cancel whenever you wish.",
  },
  {
    question: "How is Deen Relief regulated?",
    answer:
      "Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.",
    links: [
      {
        href: "https://register-of-charities.charitycommission.gov.uk/charity-details/?regid=1158608&subid=0",
        label: "Charity Commission register",
      },
    ],
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function QurbaniPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Qurbani 2026", href: "/qurbani" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[80vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/qurbani-hero-v4.webp"
              alt="A Deen Relief field worker with around twenty Bangladeshi children, alongside dozens of packed Qurbani aid parcels and food supplies ready for distribution"
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
              <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-amber mb-3">
                Eid al-Adha 2026
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Donate Your Qurbani 2026
              </h1>
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                Fulfil the Sunnah of Ibrahim (AS) this Eid.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Sheep, goat, and cow shares from £50. Performed locally
                and delivered to families in need.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <HeroDeadline />
              <Button variant="primary" href="#donate-form">
                Donate Qurbani Now
              </Button>
            </div>
          </div>

          <ProofTag location="Bangladesh" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel ─── */}
        {/* Image-less, centered layout (Zakat pattern). The Qurbani product
            picker carries the full visual weight and benefits from the
            extra width. */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white scroll-mt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <blockquote className="text-center mb-8 max-w-lg mx-auto">
              <p className="text-charcoal/40 text-sm italic leading-relaxed font-heading">
                &ldquo;Whoever offers a sacrifice after the (Eid) prayer,
                has completed his rituals (of Qurbani) and has succeeded
                in following the way of the Muslims.&rdquo;
              </p>
              <cite className="text-charcoal/25 text-xs not-italic mt-1 block">
                — Bukhari
              </cite>
            </blockquote>

            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8">
              <DonationForm />
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. What Your Donation Funds ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Where Your Qurbani Goes
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Performed Locally, Distributed Locally
                </h2>

                {/* Mobile-only inline video — Bangladesh Qurbani 2024
                    distribution by boat (rural villages reached during the
                    monsoon Eid). Poster-first via LazyVideo: the 7.8 MB
                    file only downloads when the donor taps play. */}
                <div className="lg:hidden relative rounded-2xl overflow-hidden aspect-[4/5] mb-6 bg-charcoal">
                  <LazyVideo
                    src="/videos/qurbani-bangladesh-2024.mp4"
                    poster="/videos/qurbani-bangladesh-2024-poster.jpg"
                    alt="Deen Relief team distributing Qurbani 2024 meat parcels by boat to families in rural Bangladesh"
                    posterSizes="100vw"
                    posterObjectPosition="center 50%"
                  />
                  <ProofTag location="Bangladesh — Qurbani 2024" />
                </div>

                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6">
                  Your Qurbani is performed in the country you choose, on the
                  days of Eid al-Adha, and the meat is delivered hand-to-hand
                  to families known to be in need.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      title: "Bangladesh — sheep £50 / cow £480",
                      description: "Half cow shares £240. Distributed in rural communities through our long-standing field network.",
                    },
                    {
                      title: "India — goat £120",
                      description: "Goat Qurbani delivered to families through our partners in northern India.",
                    },
                    {
                      title: "Pakistan — sheep £70 / cow £480",
                      description: "Half cow shares £240. Performed in line with local Islamic guidance and distributed locally.",
                    },
                    {
                      title: "Syria — sheep £250 / cow £1,300",
                      description: "Half cow shares £650. Higher cost reflects livestock supply in conflict-affected regions.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 items-start">
                      <svg className="w-5 h-5 text-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="font-heading font-semibold text-[0.9375rem] text-charcoal">
                          {item.title}
                        </p>
                        <p className="text-grey text-[0.8125rem] leading-[1.6]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop-only video — mobile has the inline video above.
                  Same poster-first treatment so the file only downloads
                  when the donor taps play. */}
              <div className="hidden lg:block relative rounded-2xl overflow-hidden min-h-[300px] bg-charcoal">
                <LazyVideo
                  src="/videos/qurbani-bangladesh-2024.mp4"
                  poster="/videos/qurbani-bangladesh-2024-poster.jpg"
                  alt="Deen Relief team distributing Qurbani 2024 meat parcels by boat to families in rural Bangladesh"
                  posterSizes="50vw"
                  posterObjectPosition="center 50%"
                />
                <ProofTag location="Bangladesh — Qurbani 2024" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Delivery Assurance ─── */}
        {/* bg-white (was cream) — Field Evidence section above was removed,
            so the previous Where-Your-Qurbani-Goes (cream) would now be
            adjacent to a second cream block, breaking the design system's
            no-consecutive-cream rule. White preserves alternation; FAQ
            below is also white but uses a different layout, which is
            permitted per the system. */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                How We Deliver
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                From Your Order to a Family on Eid
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Your Qurbani is not just sent — it is performed, delivered,
                and reported with full transparency.
              </p>
            </div>

            <ProcessSteps
              steps={[
                {
                  n: "01",
                  title: "We Verify",
                  body: "Our field teams identify families in need in each country, prioritising those without regular access to meat.",
                },
                {
                  n: "02",
                  title: "We Perform",
                  body: "Slaughter is carried out locally on the days of Eid al-Adha, in accordance with Islamic guidelines.",
                },
                {
                  n: "03",
                  title: "We Report",
                  body: "Audited annual reports published through the Charity Commission. Full transparency, always.",
                },
              ]}
              className="max-w-4xl mx-auto mb-12"
            />

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-charcoal/40 font-medium">
              <span>Charity No. 1158608</span>
              <span className="text-charcoal/15">|</span>
              <span>Max 10% on admin</span>
              <span className="text-charcoal/15">|</span>
              <span>Audited annually</span>
              <span className="text-charcoal/15">|</span>
              <span>Gift Aid eligible</span>
            </div>
          </div>
        </section>

        {/* ─── 7. FAQ ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Common Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Common Questions About Qurbani
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 8. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Order Your Qurbani Before 23 May
            </h2>
            <p className="text-white/55 text-sm mb-5">
              Performed locally. Distributed to families in need. Every
              Qurbani accounted for.
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
