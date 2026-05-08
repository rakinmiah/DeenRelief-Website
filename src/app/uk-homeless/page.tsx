import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import DonationForm from "./DonationForm";
import FaqAccordion from "./FaqAccordion";
import MiniDonationPicker from "./MiniDonationPicker";

/* ── FAQ data ── */
const faqs = [
  {
    question: "What does my donation fund?",
    answer:
      "Your donation funds our weekly street outreach in Brighton — hot meals, warm clothing, blankets, hygiene packs, sleeping bags, and essential supplies distributed directly to people experiencing homelessness.",
    links: [{ href: "/about", label: "About Deen Relief" }],
  },
  {
    question: "How often does the outreach happen?",
    answer:
      "Every week, rain or shine, since 2013. Our volunteer teams go out onto Brighton's streets with meals and essentials. The outreach has never stopped — not even once — in over twelve years.",
  },
  {
    question: "Can I volunteer instead of donating?",
    answer:
      "Absolutely. We welcome volunteers for our Brighton homeless outreach and other programmes. No experience is needed — just a willingness to help. Visit our volunteer page or email info@deenrelief.org to get started.",
    links: [{ href: "/volunteer", label: "Volunteer with us" }],
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Your £25 becomes £31.25 — enough to feed five people on our weekly outreach.",
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

export default function UKHomelessPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "UK Homeless Aid", href: "/uk-homeless" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[50vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/brighton-team.webp"
              alt="Deen Relief volunteers gathered at Brighton seafront for a community outreach event"
              fill
              className="object-cover object-[center_75%]"
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
                UK Homeless Outreach — Brighton
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Support Brighton&apos;s Homeless Community
              </h1>
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                Rain or shine, every week since 2013.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Hot meals, clothing, and essentials distributed on
                Brighton&apos;s streets every week by our volunteer teams.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% pledge on homeless outreach</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Support Our Outreach
              </Button>
            </div>
          </div>

          <ProofTag location="Brighton, UK" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (centred, bordered) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white scroll-mt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8">
              <DonationForm />
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. Where It All Started ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Text */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Where It All Started
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Where It All Started
                </h2>

                {/* Mobile-only inline image */}
                <div className="lg:hidden relative rounded-2xl overflow-hidden aspect-[4/3] mb-6">
                  <Image
                    src="/images/brighton-mosque-outreach.webp"
                    alt="Deen Relief volunteers in hi-vis vests distributing food outside Al-Medinah Mosque, Brighton"
                    fill
                    className="object-cover object-center"
                    sizes="100vw"
                  />
                  <ProofTag location="Brighton, UK" position="bottom-right" />
                </div>

                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  In 2013, founding trustee Shabek Ali began walking
                  Brighton&apos;s streets with hot meals and essentials for
                  the homeless community. No office, no website, no
                  fundraising campaigns — just a person who saw a need and
                  decided to act.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  That weekly outreach has never stopped. Every week since
                  2013, rain or shine, our volunteer teams go out onto
                  Brighton&apos;s streets with hot meals, warm clothing,
                  hygiene packs, and a willingness to sit and listen.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                  What began on these streets grew into an international
                  charity operating across five countries. But the homeless
                  outreach that started it all continues to this day — a
                  reminder that charity begins at home.
                </p>
              </div>

              {/* Desktop image */}
              <div className="hidden lg:block relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/brighton-mosque-outreach.webp"
                  alt="Deen Relief volunteers in hi-vis vests distributing food outside Al-Medinah Mosque, Brighton"
                  fill
                  className="object-cover object-center"
                  sizes="50vw"
                />
                <ProofTag location="Brighton, UK" position="bottom-right" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. What We Deliver Every Week ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Every Week
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                What Your Donation Provides
              </h2>
            </div>

            <div className="space-y-5 max-w-xl mx-auto mb-8 flex flex-col items-center">
              {[
                "Hot meals prepared and served on the streets",
                "Warm clothing and blankets during winter months",
                "Hygiene and toiletry packs",
                "Sleeping bags and essential supplies",
                "A friendly face and someone to talk to",
              ].map((item) => (
                <div key={item} className="flex gap-3 items-center">
                  <svg className="w-5 h-5 text-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-charcoal text-base sm:text-[1.0625rem] font-medium">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-center text-grey/60 text-sm italic">
              Our volunteer teams go out every week, rain or shine.
            </p>
          </div>
        </section>

        {/* ─── 6. FAQ ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Common Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Homeless Outreach FAQs
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 7. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Charity Begins at Home
            </h2>
            <p className="text-white/55 text-sm mb-5">
              Every week, our volunteers are on Brighton&apos;s streets.
              Your donation keeps them going.
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
